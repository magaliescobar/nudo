"use server";

// Server Actions del checkout (R16). Cada paso valida con el esquema compartido
// (@nudo/commerce/schemas), guarda en la sesión de Redis y redirige al paso siguiente.
// Errores vuelven como estado serializable para useActionState (y para el POST sin JS).
import {
  addressSchema,
  contactSchema,
  deliverySchema,
  fieldErrorsOf,
  last4Of,
  paymentSchema,
  toAddress,
  type FieldErrors,
} from "@nudo/commerce/schemas";
import type { CheckoutSession } from "@nudo/commerce/catalog";
import type { Locale } from "@nudo/i18n/config";
import * as v from "valibot";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRedisStore } from "@nudo/data/redis";
import { getCartId } from "../cart";
import { getCheckoutSession, saveCheckoutSession } from "../checkout";

export type StepActionState = {
  readonly ok: boolean;
  readonly errors?: FieldErrors;
  readonly error?: string;
};

function stepHref(locale: Locale, step: string, error?: string): string {
  const base = `/${locale}/checkout/${step}`;
  return error ? `${base}?error=${error}` : base;
}

async function loadSessionOrRedirect(
  locale: Locale,
  step: string,
): Promise<{ session: CheckoutSession; cartId: string }> {
  const cartId = await getCartId();
  const session = await getCheckoutSession(cartId);
  if (!cartId || !session) redirect(`/${locale}/cart`);
  // R38: los submits de checkout son endpoints públicos — rate limit por cartId.
  const rate = await getRedisStore().rateLimit("checkoutSubmit", cartId);
  if (!rate.allowed) redirect(errorsHref(locale, step, { form: "rate-limited" }));
  return { session, cartId };
}

/** POST sin JS (MPA): document request sin header `Next-Action`. En ese caso el
 *  estado de useActionState no puede volver al cliente (la respuesta es un payload
 *  Flight), así que el error viaja en la URL y la página lo muestra al renderizar. */
async function isDocumentPost(): Promise<boolean> {
  const h = await headers();
  return h.get("next-action") == null || h.get("sec-fetch-dest") === "document";
}

function errorsHref(locale: Locale, step: string, errors: FieldErrors): string {
  const encoded = Buffer.from(JSON.stringify(errors), "utf8").toString("base64url");
  return `${stepHref(locale, step)}?e=${encoded}`;
}

/** En MPA redirige al mismo paso con `?e=`; con JS devuelve el estado inline. */
async function failStep(
  locale: Locale,
  step: string,
  errors: FieldErrors,
): Promise<StepActionState> {
  if (await isDocumentPost()) redirect(errorsHref(locale, step, errors));
  return { ok: false, errors };
}

function parseForm<T extends v.GenericSchema>(
  schema: T,
  formData: FormData,
): { data: v.InferOutput<T> } | { errors: FieldErrors } {
  const input: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") input[key] = value;
  }
  const result = v.safeParse(schema, input);
  if (!result.success) return { errors: fieldErrorsOf(result.issues) };
  return { data: result.output };
}

export async function submitContact(
  locale: Locale,
  _prev: StepActionState,
  formData: FormData,
): Promise<StepActionState> {
  const { session } = await loadSessionOrRedirect(locale, "contact");
  const parsed = parseForm(contactSchema, formData);
  if ("errors" in parsed) return failStep(locale, "contact", parsed.errors);
  const next: CheckoutSession = { ...session, contact: parsed.data, step: "shipping" };
  await saveCheckoutSession(next);
  redirect(stepHref(locale, "shipping"));
}

export async function submitShipping(
  locale: Locale,
  _prev: StepActionState,
  formData: FormData,
): Promise<StepActionState> {
  const { session } = await loadSessionOrRedirect(locale, "shipping");
  const parsed = parseForm(addressSchema, formData);
  if ("errors" in parsed) return failStep(locale, "shipping", parsed.errors);
  const next: CheckoutSession = {
    ...session,
    shipping: toAddress(parsed.data),
    step: "delivery",
  };
  await saveCheckoutSession(next);
  redirect(stepHref(locale, "delivery"));
}

export async function submitDelivery(
  locale: Locale,
  _prev: StepActionState,
  formData: FormData,
): Promise<StepActionState> {
  const { session } = await loadSessionOrRedirect(locale, "delivery");
  const parsed = parseForm(deliverySchema, formData);
  if ("errors" in parsed) return failStep(locale, "delivery", parsed.errors);
  const next: CheckoutSession = { ...session, delivery: parsed.data.method, step: "payment" };
  await saveCheckoutSession(next);
  redirect(stepHref(locale, "payment"));
}

export async function submitPayment(
  locale: Locale,
  _prev: StepActionState,
  formData: FormData,
): Promise<StepActionState> {
  const { session } = await loadSessionOrRedirect(locale, "payment");
  const parsed = parseForm(paymentSchema, formData);
  if ("errors" in parsed) return failStep(locale, "payment", parsed.errors);
  const next: CheckoutSession = {
    ...session,
    payment: {
      method: "card",
      cardNumber: parsed.data.cardNumber,
      cardName: parsed.data.cardName,
      last4: last4Of(parsed.data.cardNumber),
    },
    step: "review",
  };
  await saveCheckoutSession(next);
  redirect(stepHref(locale, "review"));
}
