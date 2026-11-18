// Esquemas de validación compartidos cliente/servidor (R16, ADR 018: valibot por peso).
// Dominio puro: sin React, sin Next.
import * as v from "valibot";
import type { Address, ShippingMethod } from "./catalog";

export const emailSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(3),
  v.maxLength(254),
  v.email("Email inválido"),
);

export const contactSchema = v.object({
  email: emailSchema,
});
export type ContactInput = v.InferOutput<typeof contactSchema>;

const requiredText = (max: number) =>
  v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(max));

export const addressSchema = v.object({
  fullName: requiredText(120),
  line1: requiredText(160),
  line2: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(160))),
  city: requiredText(80),
  region: requiredText(80),
  postalCode: requiredText(20),
  country: requiredText(80),
  phone: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(30))),
});
export type AddressInput = v.InferOutput<typeof addressSchema>;

export function toAddress(input: AddressInput): Address {
  return {
    fullName: input.fullName,
    line1: input.line1,
    ...(input.line2 ? { line2: input.line2 } : {}),
    city: input.city,
    region: input.region,
    postalCode: input.postalCode,
    country: input.country,
    ...(input.phone ? { phone: input.phone } : {}),
  };
}

export const shippingMethods = ["standard", "express"] as const satisfies readonly ShippingMethod[];

export const deliverySchema = v.object({
  method: v.picklist(shippingMethods),
});
export type DeliveryInput = v.InferOutput<typeof deliverySchema>;

const cardDigits = v.pipe(
  v.string(),
  v.transform((value) => value.replace(/\D/g, "")),
  v.minLength(13, "Número de tarjeta inválido"),
  v.maxLength(19, "Número de tarjeta inválido"),
);

export const paymentSchema = v.object({
  method: v.literal("card"),
  cardNumber: cardDigits,
  cardName: v.pipe(v.string(), v.trim(), v.minLength(2), v.maxLength(120)),
});
export type PaymentInput = v.InferOutput<typeof paymentSchema>;

/** last4 para mostrar en la revisión sin guardar el PAN completo en el cliente. */
export function last4Of(cardNumber: string): string {
  return cardNumber.replace(/\D/g, "").slice(-4);
}

/** Errores por campo para la UI (R16): `field → mensaje`. */
export type FieldErrors = Partial<Record<string, string>>;

export function fieldErrorsOf(issues: readonly v.BaseIssue<unknown>[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = String(issue.path?.[0]?.key ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
