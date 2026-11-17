// Formato con Intl (R25): precios, fechas, números, plurales y listas. Sin `if`s manuales por idioma.
import { intlTagOf, type Locale } from "./config";

/** Precio en USD formateado según el idioma. El importe llega en centavos (dominio). */
export function formatPrice(locale: Locale, amountInCents: number, currency = "USD"): string {
  return new Intl.NumberFormat(intlTagOf(locale), { style: "currency", currency }).format(
    amountInCents / 100,
  );
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intlTagOf(locale), options).format(value);
}

export function formatDate(
  locale: Locale,
  date: Date | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" },
) {
  return new Intl.DateTimeFormat(intlTagOf(locale), options).format(date);
}

export function formatList(
  locale: Locale,
  items: readonly string[],
  type: Intl.ListFormatType = "conjunction",
) {
  return new Intl.ListFormat(intlTagOf(locale), { style: "long", type }).format(items);
}

/** Formas plurales de un mensaje: las categorías salen de `Intl.PluralRules`. */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/** `plural('es', 3, { one: '# producto', other: '# productos' })` → "3 productos". */
export function plural(locale: Locale, count: number, message: PluralMessage): string {
  const tag = intlTagOf(locale);
  const category = new Intl.PluralRules(tag).select(count);
  const template = message[category] ?? message.other;
  return template.replaceAll("#", formatNumber(locale, count));
}
