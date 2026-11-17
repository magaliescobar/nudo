import { defaultLocale, type Locale } from "./config";

/** Contenido tal como llega de Atlas: un idioma recién agregado puede no estar traducido todavía. */
export type StoredLocalized<T> = Partial<Record<Locale, T>> &
  Readonly<Record<typeof defaultLocale, T>>;

export type Resolved<T> = {
  readonly value: T;
  /** Idioma real del valor: si difiere del pedido, la UI lo marca con `lang` (ADR 015). */
  readonly lang: Locale;
  readonly isFallback: boolean;
};

/** Fallback de contenido (ADR 015): idioma pedido → idioma por defecto. */
export function resolveLocalized<T>(content: StoredLocalized<T>, locale: Locale): Resolved<T> {
  const own = content[locale];
  if (own !== undefined) return { value: own, lang: locale, isFallback: false };
  return { value: content[defaultLocale], lang: defaultLocale, isFallback: true };
}
