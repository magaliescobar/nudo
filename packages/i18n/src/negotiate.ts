import { defaultLocale, isLocale, type Locale, locales } from "./config";

type NegotiationInput = {
  /** Valor de la cookie de preferencia, si existe. */
  cookie?: string | null;
  /** Header `Accept-Language` crudo. */
  acceptLanguage?: string | null;
};

/** Idiomas del header ordenados por calidad (`q`), sin los `q=0`. */
export function parseAcceptLanguage(header: string): string[] {
  return header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const quality = q ? Number(q.slice(2)) : 1;
      return { tag: tag.toLowerCase(), quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((entry) => entry.tag && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)
    .map((entry) => entry.tag);
}

/**
 * Negociación de idioma (R24): cookie de preferencia → `Accept-Language` → default.
 * Nunca usa IP ni geolocalización.
 */
export function negotiateLocale({ cookie, acceptLanguage }: NegotiationInput): Locale {
  if (isLocale(cookie)) return cookie;
  for (const tag of parseAcceptLanguage(acceptLanguage ?? "")) {
    if (tag === "*") return defaultLocale;
    const base = tag.split("-")[0];
    const match = locales.find((locale) => locale === tag || locale === base);
    if (match) return match;
  }
  return defaultLocale;
}
