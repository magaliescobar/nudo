"use server";

// Server Actions del carrito (R15). El precio y el stock se leen SIEMPRE del servidor:
// el cliente solo manda sku + qty. Los errores devuelven `{ ok:false, error }` serializable.
import type { Cart } from "@nudo/commerce/catalog";
import { headers } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getProductById } from "../catalog";
import { getRedisStore } from "@nudo/data/redis";
import { deleteCart, ensureCartId, getCart, getCartId, getSkuInfo, saveCart } from "../cart";

export type CartActionResult =
  { readonly ok: true; readonly count: number } | { readonly ok: false; readonly error: string };

const MAX_QTY = 99;

type CartLine = Cart["lines"][number];

async function persist(cartId: string, lines: CartLine[]): Promise<CartActionResult> {
  // R38: las Server Actions son endpoints públicos — rate limit por cartId.
  const rate = await getRedisStore().rateLimit("cartMutation", cartId);
  if (!rate.allowed) return { ok: false, error: "rate-limited" };
  if (lines.length === 0) {
    await deleteCart(cartId);
    return { ok: true, count: 0 };
  }
  const cart = (await getCart(cartId)) ?? { id: cartId, lines: [], updatedAt: Date.now() };
  const saved = await saveCart({ ...cart, lines, updatedAt: Date.now() });
  if (!saved) return { ok: false, error: "unavailable" };
  return { ok: true, count: lines.reduce((sum, line) => sum + line.qty, 0) };
}

export async function addToCart(sku: string, qty = 1): Promise<CartActionResult> {
  if (!sku || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    return { ok: false, error: "invalid-input" };
  }
  const found = await getSkuInfo(sku);
  if (!found || found.available <= 0) return { ok: false, error: "unavailable" };

  const cartId = await ensureCartId();
  const cart = (await getCart(cartId)) ?? { id: cartId, lines: [], updatedAt: Date.now() };
  const existing = cart.lines.find((line) => line.sku === sku);
  const lines = cart.lines.filter((line) => line.sku !== sku);
  lines.push({
    sku,
    qty: Math.min((existing?.qty ?? 0) + qty, MAX_QTY),
    priceAtAdd: existing?.priceAtAdd ?? found.info.price.amountInCents,
  });
  return persist(cartId, lines);
}

export async function updateCartQty(sku: string, qty: number): Promise<CartActionResult> {
  if (!sku || !Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) {
    return { ok: false, error: "invalid-input" };
  }
  const cartId = await getCartId();
  if (!cartId) return { ok: true, count: 0 };
  const cart = await getCart(cartId);
  if (!cart) return { ok: true, count: 0 };
  const existing = cart.lines.find((line) => line.sku === sku);
  const lines = cart.lines.filter((line) => line.sku !== sku);
  if (qty > 0 && existing) {
    lines.push({
      sku,
      qty,
      ...(existing.priceAtAdd != null ? { priceAtAdd: existing.priceAtAdd } : {}),
    });
  }
  return persist(cartId, lines);
}

export async function removeCartLineAction(sku: string): Promise<CartActionResult> {
  const cartId = await getCartId();
  if (!cartId) return { ok: true, count: 0 };
  const cart = await getCart(cartId);
  if (!cart) return { ok: true, count: 0 };
  return persist(
    cartId,
    cart.lines.filter((line) => line.sku !== sku),
  );
}

// ---------- Wrappers FormData (forms POST sin JS, progressive enhancement) ----------

/** Vuelve a la página que originó el POST (carrito/minicarrito/checkout). */
async function backToReferer(): Promise<never> {
  const referer = (await headers()).get("referer");
  // `refresh()` marca el client router para re-renderizar el árbol actual: sin esto,
  // un redirect al MISMO url no reconsulta y el badge/mini-cart muestran datos viejos
  // (p. ej. agregar la misma prenda dos veces parecía no sumar). Sin JS, el redirect
  // igual provoca un full reload del MPA.
  refresh();
  redirect(referer ?? "/");
}

/** PDP: resuelve sku desde productId+variantId+size contra el catálogo cacheado. */
export async function addToCartPdp(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "");
  const size = String(formData.get("size") ?? "");
  const qty = Number(formData.get("qty") ?? 1);
  const product = productId ? await getProductById(productId) : null;
  const variant = product?.variants.find((v) => v.id === variantId);
  const sku = variant?.skus.find((s) => s.size === size)?.sku;
  if (!sku || !Number.isInteger(qty) || qty < 1) {
    await backToReferer();
  }
  await addToCart(sku!, qty);
  await backToReferer();
}

export async function updateCartLineForm(formData: FormData): Promise<void> {
  const sku = String(formData.get("sku") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  await updateCartQty(sku, qty);
  await backToReferer();
}

export async function removeCartLineForm(formData: FormData): Promise<void> {
  const sku = String(formData.get("sku") ?? "");
  await removeCartLineAction(sku);
  await backToReferer();
}
