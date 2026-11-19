import "server-only";
import { defaultLocale, locales, type Locale } from "@nudo/i18n/config";
import type { Category, Product } from "@nudo/commerce/catalog";

/** Origen público para URLs absolutas (metadataBase, OG, sitemap, llms.txt). */
export function siteUrl(): string {
  return (
    // SITE_URL es server-only: el prefijo NEXT_PUBLIC_ la metería en el bundle
    // del cliente sin necesidad (warning de Vercel). Se acepta el nombre viejo
    // como fallback para no romper despliegues existentes.
    (
      process.env.SITE_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3100")
    ).replace(/\/+$/, "")
  );
}

export type LocalizedPaths = Record<Locale, string>;

/**
 * R27: canonical a la propia URL (relativo contra metadataBase) + hreflang recíproco
 * entre locales con `x-default` al locale por defecto.
 */
export function localizedAlternates(locale: Locale, paths: LocalizedPaths) {
  return {
    canonical: paths[locale],
    languages: {
      ...paths,
      "x-default": paths[defaultLocale],
    },
  };
}

export function homePaths(): LocalizedPaths {
  return Object.fromEntries(locales.map((l) => [l, `/${l}`])) as LocalizedPaths;
}

export function productPaths(product: Product): LocalizedPaths {
  return Object.fromEntries(
    locales.map((l) => [l, `/${l}/p/${product.slug[l]}`]),
  ) as LocalizedPaths;
}

export function searchPaths(): LocalizedPaths {
  return Object.fromEntries(locales.map((l) => [l, `/${l}/search`])) as LocalizedPaths;
}

/**
 * Dimensiones de faceta indexables (R28): una categoría con 0 o 1 dimensión de
 * faceta es indexable; el resto se rastrea pero no se indexa (`noindex,follow`).
 */
export function indexablePlpState(state: {
  q?: string;
  cats: readonly string[];
  colors: readonly string[];
  sizes: readonly string[];
  brands: readonly string[];
  inStock: boolean;
  priceMinCents?: number;
  priceMaxCents?: number;
  sort: string;
}): boolean {
  if (state.q) return false;
  if (state.sort !== "relevance") return false;
  if (state.priceMinCents != null || state.priceMaxCents != null) return false;
  const facetDims =
    Number(state.cats.length > 0) +
    Number(state.colors.length > 0) +
    Number(state.sizes.length > 0) +
    Number(state.brands.length > 0) +
    Number(state.inStock);
  return facetDims <= 1;
}

/** Path de categoría canónico en cualquier locale (para hreflang). */
export function categoryPath(category: Category, all: readonly Category[], locale: Locale): string {
  const byId = new Map(all.map((c) => [c.id, c]));
  const segments = [...category.path.map((id) => byId.get(id)), category].map(
    (c) => c!.slug[locale],
  );
  return `/${locale}/c/${segments.join("/")}`;
}

export function categoryPaths(category: Category, all: readonly Category[]): LocalizedPaths {
  return Object.fromEntries(
    locales.map((l) => [l, categoryPath(category, all, l)]),
  ) as LocalizedPaths;
}
