// Dominio puro: sin React, sin Next, sin acceso a datos (R01).
export const currency = "USD" as const;

/** Importe en centavos para evitar errores de punto flotante. */
export type Money = {
  readonly amountInCents: number;
  readonly currency: typeof currency;
};

export function money(amountInCents: number): Money {
  if (!Number.isInteger(amountInCents) || amountInCents < 0) {
    throw new RangeError(`Importe inválido: ${amountInCents}`);
  }
  return { amountInCents, currency };
}
