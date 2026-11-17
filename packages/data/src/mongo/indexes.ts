import { locales } from "@nudo/i18n/config";
import type { Db, IndexDescription } from "mongodb";
import { collectionNames, collections } from "./collections";

/** Índices mínimos de §6. Los de slug se derivan de la config de idiomas. */
export const indexes = {
  products: [
    ...locales.map((locale): IndexDescription => ({
      key: { [`slug.${locale}`]: 1 },
      name: `slug_${locale}_unique`,
      unique: true,
      // Un idioma recién agregado puede no tener slugs todavía (ADR 015).
      partialFilterExpression: { [`slug.${locale}`]: { $type: "string" } },
    })),
    { key: { status: 1, categoryIds: 1 }, name: "status_categoryIds" },
    { key: { "variants.skus.sku": 1 }, name: "variants_skus_sku" },
  ],
  inventory: [{ key: { sku: 1 }, name: "sku_unique", unique: true }],
  categories: locales.map((locale): IndexDescription => ({
    key: { [`slug.${locale}`]: 1 },
    name: `slug_${locale}_unique`,
    unique: true,
    partialFilterExpression: { [`slug.${locale}`]: { $type: "string" } },
  })),
  orders: [
    { key: { idempotencyKey: 1 }, name: "idempotencyKey_unique", unique: true },
    { key: { number: 1 }, name: "number_unique", unique: true },
  ],
  redirects: [{ key: { from: 1 }, name: "from_unique", unique: true }],
} satisfies Record<keyof typeof collectionNames, IndexDescription[]>;

export const searchIndexName = "products_search";

/**
 * Atlas Search (R02/ADR 009): facetas por categoría, color, talle, marca y precio;
 * texto en cada idioma con su analizador. Se deriva de la config de idiomas.
 */
const analyzers: Record<string, string> = { es: "lucene.spanish", en: "lucene.english" };

export const searchIndexDefinition = {
  mappings: {
    dynamic: false,
    fields: {
      status: { type: "token" },
      brand: [{ type: "token" }, { type: "stringFacet" }],
      categoryIds: [{ type: "objectId" }, { type: "token" }],
      name: {
        type: "document",
        fields: Object.fromEntries(
          locales.map((locale) => [
            locale,
            { type: "string", analyzer: analyzers[locale] ?? "lucene.standard" },
          ]),
        ),
      },
      description: {
        type: "document",
        fields: Object.fromEntries(
          locales.map((locale) => [
            locale,
            { type: "string", analyzer: analyzers[locale] ?? "lucene.standard" },
          ]),
        ),
      },
      search: {
        type: "document",
        fields: {
          colors: [{ type: "token" }, { type: "stringFacet" }],
          sizes: [{ type: "token" }, { type: "stringFacet" }],
          minPrice: [{ type: "number" }, { type: "numberFacet" }],
          maxPrice: { type: "number" },
          inStock: { type: "boolean" },
        },
      },
      updatedAt: { type: "date" },
    },
  },
} as const;

export async function ensureIndexes(db: Db): Promise<void> {
  const cols = collections(db);
  for (const [name, specs] of Object.entries(indexes) as [
    keyof typeof indexes,
    IndexDescription[],
  ][]) {
    await cols[name].createIndexes(specs);
  }
}

/** Crea o actualiza el índice de Atlas Search. Fuera de Atlas (Mongo local) no existe y se informa. */
export async function ensureSearchIndex(db: Db): Promise<"created" | "updated" | "unsupported"> {
  const products = collections(db).products;
  try {
    const existing = await products.listSearchIndexes(searchIndexName).toArray();
    if (existing.length > 0) {
      await products.updateSearchIndex(searchIndexName, searchIndexDefinition);
      return "updated";
    }
    await products.createSearchIndex({ name: searchIndexName, definition: searchIndexDefinition });
    return "created";
  } catch (error) {
    if (
      error instanceof Error &&
      /not (supported|allowed)|Atlas|CommandNotFound/i.test(error.message)
    ) {
      return "unsupported";
    }
    throw error;
  }
}
