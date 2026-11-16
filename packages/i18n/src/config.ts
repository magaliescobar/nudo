// Única fuente de verdad de los idiomas soportados (R24/R26). Agregar un idioma empieza acá.
export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
