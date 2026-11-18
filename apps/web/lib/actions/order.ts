"use server";

// Confirmación de pedido (R16/R17): idempotente por `idempotencyKey` de la sesión,
// lock en Redis contra submits paralelos, índice único en Mongo como última línea,
// descuento atómico de stock y gateway fake. Nada privado se cachea.
import { chargeFake, firstIncompleteStep, totals } from "@nudo/commerce/checkout";
import type { CartView } from "@nudo/commerce/cart";
import type { Order, OrderLine } from "@nudo/commerce/catalog";
import type { Locale } from "@nudo/i18n/config";
import { randomInt, randomUUID } from "node:crypto";
import { getRepositories } from "@nudo/data/repositories";
import { getRedisStore } from "@nudo/data/redis";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { deleteCart, getCart, getCartId, getCartView } from "../cart";
import { deleteCheckoutSession, getCheckoutSession } from "../checkout";

export type ConfirmResult = { readonly ok: boolean; readonly error?: string };

function orderNumber(): string {
  const now = new Date();
  const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `NUDO-${yyyymm}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
}

async function buildLines(view: CartView, locale: Locale): Promise<OrderLine[]> {
  return view.lines.map((line) => ({
    sku: line.sku,
    name: line.info.productName[locale],
    variant: line.info.colorName[locale],
    size: line.info.size,
    qty: line.qty,
    unitPrice: line.unitPrice,
  }));
}

/** Reintenta la generación de número si choca el índice único (duplicados concurrentes). */
async function createOrderWithRetry(
  order: Omit<Order, "id">,
): Promise<{ order: Order; created: boolean }> {
  const repos = await getRepositories();
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await repos.orders.create({ ...order, number: orderNumber() });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/** Wrapper useActionState del botón de confirmar (firma prev/fd que exige el hook).
 *  Sin JS el estado devuelto no llega al cliente (respuesta Flight), así que un
 *  resultado fallido vuelve como redirect al review con `?error=` en la URL. */
export async function confirmOrderAction(
  locale: Locale,
  _prev: ConfirmResult,
  _formData: FormData,
): Promise<ConfirmResult> {
  const result = await confirmOrder(locale);
  if (!result.ok) {
    const h = await headers();
    if (h.get("next-action") == null || h.get("sec-fetch-dest") === "document") {
      redirect(`/${locale}/checkout/review?error=${result.error ?? "generic"}`);
    }
  }
  return result;
}

export async function confirmOrder(locale: Locale): Promise<ConfirmResult> {
  const cartId = await getCartId();
  const [session, cart] = await Promise.all([getCheckoutSession(cartId), getCart(cartId)]);
  if (!cartId || !session || !cart || cart.lines.length === 0) {
    return { ok: false, error: "empty-cart" };
  }
  if (!session.contact || !session.shipping || !session.delivery || !session.payment) {
    redirect(`/${locale}/checkout/${firstIncompleteStep(session)}`);
  }

  const store = getRedisStore();
  const rate = await store.rateLimit("orderConfirm", cartId);
  if (!rate.allowed) return { ok: false, error: "rate-limited" };

  // Idempotencia: misma key ⇒ mismo pedido, sin duplicar cargo ni stock.
  const prior = await store.idempotency.get<{ number: string; token: string }>(
    session.idempotencyKey,
  );
  if (prior.ok && prior.value) {
    redirect(`/${locale}/order/${prior.value.number}?token=${prior.value.token}`);
  }

  const lock = await store.acquireOrderLock(session.idempotencyKey);
  if (!lock.ok) return { ok: false, error: "unavailable" };
  if (lock.value == null) {
    // Otra request tiene el lock: puede estar por terminar. Reintento corto y salida amable.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const again = await store.idempotency.get<{ number: string; token: string }>(
      session.idempotencyKey,
    );
    if (again.ok && again.value) {
      redirect(`/${locale}/order/${again.value.number}?token=${again.value.token}`);
    }
    return { ok: false, error: "processing" };
  }

  const release = () => store.releaseOrderLock(session.idempotencyKey, lock.value!);

  try {
    // Revalidación final contra catálogo + stock vigentes (nunca del cliente).
    const view = await getCartView(cartId);
    if (view.lines.length === 0 || view.missingSkus.length > 0) {
      await release();
      redirect(`/${locale}/cart`);
    }
    if (view.lines.some((line) => line.exceedsStock)) {
      await release();
      return { ok: false, error: "stock" };
    }
    if (view.notices.includes("price-changed")) {
      await release();
      return { ok: false, error: "price-changed" };
    }

    const payment = session.payment!;
    const paymentResult = await chargeFake({
      method: payment.method,
      cardNumber: payment.cardNumber,
      cardName: payment.cardName,
    });
    if (paymentResult.status === "declined") {
      await release();
      return { ok: false, error: "declined" };
    }
    if (paymentResult.status === "timeout") {
      await release();
      return { ok: false, error: "timeout" };
    }

    const repos = await getRepositories();
    const stockLines = view.lines.map((line) => ({ sku: line.sku, qty: line.qty }));
    const decremented = await repos.inventory.decrementAll(stockLines);
    if (!decremented.ok) {
      await release();
      return { ok: false, error: "stock" };
    }

    const orderTotals = totals(view.subtotal, session.delivery);
    const accessToken = randomUUID();
    const orderBase: Omit<Order, "id"> = {
      number: orderNumber(),
      locale,
      lines: await buildLines(view, locale),
      totals: orderTotals,
      customer: { email: session.contact.email },
      shipping: { address: session.shipping, method: session.delivery },
      status: "paid",
      idempotencyKey: session.idempotencyKey,
      accessToken,
      createdAt: new Date(),
    };

    let created: Order;
    try {
      const result = await createOrderWithRetry(orderBase);
      created = result.order;
    } catch (error) {
      // El pedido no se creó: devolvemos el stock descontado.
      await Promise.all(stockLines.map((line) => repos.inventory.increment(line.sku, line.qty)));
      await release();
      throw error;
    }

    await store.idempotency.set(session.idempotencyKey, {
      number: created.number,
      token: accessToken,
      orderId: created.id,
    });
    await deleteCart(cartId);
    await deleteCheckoutSession(cartId);
    await release();

    redirect(`/${locale}/order/${created.number}?token=${accessToken}`);
  } catch (error) {
    // redirect() también pasa por acá: hay que dejarlo propagar intacto.
    if (isRedirectError(error)) throw error;
    await release();
    throw error;
  }
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}
