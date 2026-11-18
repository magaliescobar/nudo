// Checkout de invitado (R16): máquina de pasos, envíos, totales y gateway fake.
// Dominio puro: sin React, sin Next, sin acceso a datos.
import type { CheckoutSession, ShippingMethod } from "./catalog";
import { money, type Money } from "./money";

export const checkoutSteps = [
  "contact",
  "shipping",
  "delivery",
  "payment",
  "review",
] as const satisfies readonly CheckoutSession["step"][];

export type CheckoutStepName = (typeof checkoutSteps)[number];

export function stepIndex(step: CheckoutStepName): number {
  return checkoutSteps.indexOf(step);
}

/** Un paso es accesible si la sesión ya completó todos los anteriores. */
export function canAccessStep(session: CheckoutSession, step: CheckoutStepName): boolean {
  switch (step) {
    case "contact":
      return true;
    case "shipping":
      return session.contact != null;
    case "delivery":
      return session.contact != null && session.shipping != null;
    case "payment":
      return session.contact != null && session.shipping != null && session.delivery != null;
    case "review":
      return (
        session.contact != null &&
        session.shipping != null &&
        session.delivery != null &&
        session.payment != null
      );
  }
}

/** Primer paso incompleto: destino de las guardas cuando la URL no corresponde. */
export function firstIncompleteStep(session: CheckoutSession): CheckoutStepName {
  for (let i = 0; i < checkoutSteps.length; i++) {
    const step = checkoutSteps[i]!;
    const next = checkoutSteps[i + 1];
    const done = next ? canAccessStep(session, next) : canAccessStep(session, "review");
    if (!done) return step;
  }
  return "review";
}

/** Costo de envío por método (centavos USD). Documentado en docs/checkout.md. */
export const shippingCosts = {
  standard: money(600),
  express: money(1800),
} as const satisfies Record<ShippingMethod, Money>;

export function shippingCost(method: ShippingMethod): Money {
  return shippingCosts[method];
}

export function totals(
  subtotal: Money,
  method: ShippingMethod | undefined,
): { subtotal: Money; shipping: Money; total: Money } {
  const shipping = method ? shippingCost(method) : money(0);
  return { subtotal, shipping, total: money(subtotal.amountInCents + shipping.amountInCents) };
}

// ---------- Gateway de pago fake (R16) ----------

export type FakePaymentMethod = "card";

export type FakePaymentInput = {
  readonly method: FakePaymentMethod;
  /** Los últimos 4 dígitos deciden el caso: 0002 rechaza, 0003 timeout, resto aprueba. */
  readonly cardNumber: string;
  readonly cardName: string;
};

export type PaymentResult =
  | { readonly status: "approved"; readonly authCode: string }
  | { readonly status: "declined" }
  | { readonly status: "timeout" };

const digitsOnly = (value: string) => value.replace(/\D/g, "");

/**
 * Gateway simulado determinístico:
 * - termina en `0002` → rechazado
 * - termina en `0003` → timeout (tarda `delayMs` y falla, como un gateway caído)
 * - cualquier otro → aprobado con código de autorización derivado del número
 */
export async function chargeFake(input: FakePaymentInput, delayMs = 400): Promise<PaymentResult> {
  const last4 = digitsOnly(input.cardNumber).slice(-4);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  if (last4 === "0002") return { status: "declined" };
  if (last4 === "0003") return { status: "timeout" };
  const authCode = `FAKE-${digitsOnly(input.cardNumber).slice(-8).padStart(8, "0")}`;
  return { status: "approved", authCode };
}
