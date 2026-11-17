// Convención de tags de caché (R20). Documentada en docs/caching.md: mantener ambos en sync.
// Los tags son de negocio y estables; el prefijo de entorno lo agrega el cache handler en sus
// claves de Redis, no acá (así `updateTag("product:p1")` significa lo mismo en todo entorno).
import type { Locale } from "@nudo/i18n/config";

export const tags = {
  /** Ficha completa: nombre, descripción, galería, precios de lista, slug. */
  product: (productId: string) => `product:${productId}`,
  /** Listados y navegación de una categoría (PLP, menú). */
  category: (categoryId: string) => `category:${categoryId}`,
  /** Disponibilidad de un SKU. Nunca va junto a la descripción/galería. */
  stock: (sku: string) => `stock:${sku}`,
  /** Todo lo renderizado para un idioma (diccionarios, contenido editorial). */
  locale: (locale: Locale) => `locale:${locale}`,
  /** Índice global del catálogo: sitemap, llms.txt, búsqueda y facetas. */
  catalog: "catalog",
  /** Contenido editorial (home, campañas). */
  editorial: "editorial",
} as const;

const tagPattern = /^(?:(?:product|category|stock|locale):[A-Za-z0-9_-]{1,64}|catalog|editorial)$/;

/** Valida tags entrantes (endpoint interno): solo la convención documentada. */
export function isValidTag(tag: string): boolean {
  return tagPattern.test(tag);
}

export type CatalogMutation =
  | {
      kind: "price" | "rename" | "status" | "slug";
      productId: string;
      categoryIds: readonly string[];
    }
  | { kind: "stock"; skus: readonly string[] };

/**
 * Tags exactos que invalida cada mutación (§3.4). Stock ⇒ solo `stock:{sku}`:
 * la descripción y la galería del producto quedan en caché (ADR 009).
 */
export function tagsForMutation(mutation: CatalogMutation): string[] {
  if (mutation.kind === "stock") return mutation.skus.map(tags.stock);
  const result = [tags.product(mutation.productId), ...mutation.categoryIds.map(tags.category)];
  // Estado y slug cambian sitemap/llms.txt, la búsqueda y la existencia de la URL.
  if (mutation.kind === "status" || mutation.kind === "slug") result.push(tags.catalog);
  return result;
}
