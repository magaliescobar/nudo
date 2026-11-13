// Única fuente de verdad de los idiomas soportados (R24/R26). Agregar un idioma empieza acá.
export const localeConfig = {
  es: { dir: "ltr", intl: "es-AR" },
  en: { dir: "ltr", intl: "en-US" },
} as const satisfies Record<string, { dir: "ltr" | "rtl"; intl: string }>;

export type Locale = keyof typeof localeConfig;

export const locales = Object.keys(localeConfig) as Locale[];

export const defaultLocale: Locale = "es";

/** Cookie con la preferencia explícita de idioma (la escribe el selector de idioma). */
export const localeCookie = "NUDO_LOCALE";

/** Valor por idioma: agregar un locale a la config obliga a completar cada `Localized<T>`. */
export type Localized<T> = Readonly<Record<Locale, T>>;

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && Object.hasOwn(localeConfig, value);
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return localeConfig[locale].dir;
}

/** Tag BCP 47 para `Intl` (formato de moneda, fechas y números). */
export function intlTagOf(locale: Locale): string {
  return localeConfig[locale].intl;
}
