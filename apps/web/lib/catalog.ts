// Lecturas de catálogo cacheadas (R20). Tres niveles:
// 1. `React.cache`: deduplica lecturas repetidas dentro del mismo request.
// 2. `'use cache'` + perfil de negocio + tags: va al cache handler (L1 memoria → L2 Redis).
// 3. Mongo, solo en miss (una vez por clave gracias al lock anti-stampede del handler).
// Nunca pasa por acá nada privado (carrito, checkout): eso vive en Redis vía @nudo/data/redis.
import "server-only";
import { tags } from "@nudo/data/cache/tags";
import { measure } from "@nudo/data/observability/context";
import { getRepositories } from "@nudo/data/repositories";
import type { Locale } from "@nudo/i18n/config";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";

async function loadProductById(id: string) {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.product(id));
  const product = await measure("mongo", async () =>
    (await getRepositories()).products.findById(id),
  );
  if (product) cacheTag(...product.categoryIds.map(tags.category));
  return product;
}

async function loadProductBySlug(locale: Locale, slug: string) {
  "use cache";
  cacheLife("catalog");
  // Un slug inexistente se invalida con `catalog` (cambios de slug/estado, §3.4).
  cacheTag(tags.locale(locale), tags.catalog);
  const product = await measure("mongo", async () =>
    (await getRepositories()).products.findBySlug(locale, slug),
  );
  if (product) cacheTag(tags.product(product.id), ...product.categoryIds.map(tags.category));
  return product;
}

/** Disponible = available − reserved, por SKU. Solo `stock:{sku}`: no invalida la ficha. */
async function loadStock(skuList: string) {
  "use cache";
  cacheLife("stock");
  const skus = skuList.split(",");
  cacheTag(...skus.map(tags.stock));
  const inventory = await measure("mongo", async () =>
    (await getRepositories()).inventory.getMany(skus),
  );
  const available: Record<string, number> = Object.fromEntries(skus.map((sku) => [sku, 0]));
  for (const item of inventory) available[item.sku] = Math.max(0, item.available - item.reserved);
  return available;
}

async function loadCategories() {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.catalog);
  const categories = await measure("mongo", async () => (await getRepositories()).categories.all());
  cacheTag(...categories.map((category) => tags.category(category.id)));
  return categories;
}

// `catalog` en Server-Timing: tiempo de la lectura cacheada (en un miss incluye Mongo; el cuerpo
// de `'use cache'` corre fuera del AsyncLocalStorage del request, ver docs/caching.md).
export const getProductById = cache((id: string) => measure("catalog", () => loadProductById(id)));
export const getProductBySlug = cache((locale: Locale, slug: string) =>
  measure("catalog", () => loadProductBySlug(locale, slug)),
);
export const getCategories = cache(() => measure("catalog", loadCategories));

const getStockByKey = cache((skuList: string) => measure("catalog", () => loadStock(skuList)));

/** Clave canónica (SKUs ordenados y únicos) para que el mismo conjunto comparta entrada. */
export function getStock(skus: readonly string[]) {
  return getStockByKey([...new Set(skus)].sort().join(","));
}
