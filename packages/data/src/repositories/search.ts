// PLP (R11): una agregación `$search` para la página de resultados y un `$searchMeta`
// por faceta cuyas cuentas excluyen el filtro de esa misma faceta ("los demás filtros
// activos"). Son 6 agregaciones constantes en paralelo, cacheadas por 'use cache' en
// apps/web/lib — nunca N+1 por producto.
import type { Product } from "@nudo/commerce/catalog";
import type { Locale } from "@nudo/i18n/config";
import type { Db } from "mongodb";
import { collections, toProduct } from "../mongo/collections";
import { searchIndexName } from "../mongo/indexes";

export const plpPageSize = 24;

export type PlpSort = "relevance" | "price-asc" | "price-desc" | "newest";
export const plpSorts: readonly PlpSort[] = ["relevance", "price-asc", "price-desc", "newest"];

export function isPlpSort(value: string | undefined): value is PlpSort {
  return value != null && (plpSorts as readonly string[]).includes(value);
}

/** Filtros ya normalizados (la URL canónica se arma en apps/web/lib/plp-url.ts). */
export type PlpFilters = {
  readonly categoryIds?: readonly string[];
  readonly colors?: readonly string[];
  readonly sizes?: readonly string[];
  readonly brands?: readonly string[];
  readonly priceMinCents?: number;
  readonly priceMaxCents?: number;
  readonly inStock?: boolean;
  readonly q?: string;
};

export type FacetBucket = { readonly value: string; readonly count: number };
export type PlpFacets = {
  readonly categories: readonly FacetBucket[];
  readonly colors: readonly FacetBucket[];
  readonly sizes: readonly FacetBucket[];
  readonly brands: readonly FacetBucket[];
  /** Productos con stock bajo los demás filtros (para la etiqueta "solo con stock"). */
  readonly inStockCount: number;
};

export type PlpPage = {
  readonly products: readonly Product[];
  readonly total: number;
  readonly page: number;
  readonly pageCount: number;
  readonly facets: PlpFacets;
};

type SearchOperator = Record<string, unknown>;

/** Dimensiones excluibles al armar el operador de una cuenta de faceta. */
type ExcludedFilter = FacetDimension | "inStock";

function textClause(locale: Locale, q: string | undefined): SearchOperator[] {
  const query = q?.trim();
  if (!query) return [];
  return [{ text: { query, path: `name.${locale}` } }];
}

/** Cláusulas `filter`/`must` de todas las dimensiones menos `except` (cuentas de faceta). */
function clauses(
  filters: PlpFilters,
  locale: Locale,
  except?: ExcludedFilter,
): { must: SearchOperator[]; filter: SearchOperator[] } {
  const must = textClause(locale, filters.q);
  const filter: SearchOperator[] = [{ equals: { path: "status", value: "active" } }];

  const inList = (path: string, values: readonly string[] | undefined) => {
    if (!values || values.length === 0) return;
    filter.push({ in: { path, value: [...values] } });
  };

  if (except !== "categories") inList("search.categories", filters.categoryIds);
  if (except !== "colors") inList("search.colors", filters.colors);
  if (except !== "sizes") inList("search.sizes", filters.sizes);
  if (except !== "brands") inList("brand", filters.brands);
  if (except !== "inStock" && filters.inStock) {
    filter.push({ equals: { path: "search.inStock", value: true } });
  }
  // El rango de precio no tiene faceta propia: siempre pesa en las cuentas de las demás.
  // Solapamiento de rangos: el producto matchea si [minPrice,maxPrice] ∩ [min,max] ≠ ∅.
  if (filters.priceMinCents != null) {
    filter.push({ range: { path: "search.maxPrice", gte: filters.priceMinCents } });
  }
  if (filters.priceMaxCents != null) {
    filter.push({ range: { path: "search.minPrice", lte: filters.priceMaxCents } });
  }
  return { must, filter };
}

function compound(filters: PlpFilters, locale: Locale, except?: ExcludedFilter) {
  const { must, filter } = clauses(filters, locale, except);
  return { ...(must.length ? { must } : {}), filter };
}

const facetDefinitions = {
  categories: { type: "string", path: "search.categories", numBuckets: 50 },
  colors: { type: "string", path: "search.colors", numBuckets: 50 },
  sizes: { type: "string", path: "search.sizes", numBuckets: 50 },
  brands: { type: "string", path: "brand", numBuckets: 50 },
} as const;

type FacetDimension = keyof typeof facetDefinitions;

type SearchMetaResponse = {
  count?: { total?: number };
  facet?: Record<string, { buckets?: { _id: unknown; count: number }[] }>;
};

function buckets(meta: SearchMetaResponse | undefined, key: string): FacetBucket[] {
  return (meta?.facet?.[key]?.buckets ?? [])
    .filter((b) => typeof b._id === "string" && b.count > 0)
    .map((b) => ({ value: b._id as string, count: b.count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function sortClause(sort: PlpSort, hasQuery: boolean): Record<string, unknown> | undefined {
  switch (sort) {
    case "price-asc":
      return { "search.minPrice": 1, updatedAt: -1 };
    case "price-desc":
      return { "search.minPrice": -1, updatedAt: -1 };
    case "newest":
      return { updatedAt: -1 };
    case "relevance":
      // Con texto el orden default ya es por score; sin texto "relevancia" = novedades.
      return hasQuery ? undefined : { updatedAt: -1 };
  }
}

type PlpAggregateResult = {
  items: Parameters<typeof toProduct>[0][];
  total: { count: number }[];
};

export function createSearchRepository(db: Db) {
  const { products } = collections(db);

  async function facets(filters: PlpFilters, locale: Locale): Promise<PlpFacets> {
    const dimensions = Object.keys(facetDefinitions) as FacetDimension[];
    // Atlas no tiene facetas boolean: el conteo de "solo con stock" sale de un $searchMeta
    // con count sobre los demás filtros y inStock forzado (ignora el propio filtro).
    const inStockCompound = compound({ ...filters, inStock: true }, locale, "inStock");
    inStockCompound.filter.push({ equals: { path: "search.inStock", value: true } });
    // Secuencial a propósito: maxPoolSize=10 y el prerender dispara varias PLP a la vez;
    // 5 agregaciones en paralelo por página agotaban el pool (MongoWaitQueueTimeoutError).
    const metas: (SearchMetaResponse | undefined)[] = [];
    for (const dimension of dimensions) {
      const [meta] = await products
        .aggregate<SearchMetaResponse>([
          {
            $searchMeta: {
              index: searchIndexName,
              facet: {
                operator: { compound: compound(filters, locale, dimension) },
                facets: { [dimension]: facetDefinitions[dimension] },
              },
            },
          },
        ])
        .toArray();
      metas.push(meta);
    }
    const [inStockMeta] = await products
      .aggregate<SearchMetaResponse>([
        {
          $searchMeta: {
            index: searchIndexName,
            count: { type: "total" },
            compound: inStockCompound,
          },
        },
      ])
      .toArray();
    const byDimension = Object.fromEntries(
      dimensions.map((dimension, i) => [dimension, metas[i]]),
    ) as Record<FacetDimension, SearchMetaResponse | undefined>;
    const inStockCount = inStockMeta?.count?.total ?? 0;

    return {
      categories: buckets(byDimension.categories, "categories"),
      colors: buckets(byDimension.colors, "colors"),
      sizes: buckets(byDimension.sizes, "sizes"),
      brands: buckets(byDimension.brands, "brands"),
      inStockCount,
    };
  }

  return {
    async plp(filters: PlpFilters, locale: Locale, sort: PlpSort, page: number): Promise<PlpPage> {
      const hasQuery = Boolean(filters.q?.trim());
      const sortBy = sortClause(sort, hasQuery);
      // Secuencial a propósito: maxPoolSize=10 y el prerender dispara varias PLP a la vez;
      // agregar la página y luego las facetas mantiene el pico en ~1 conexión por PLP.
      const result = await products
        .aggregate<PlpAggregateResult>([
          {
            $search: {
              index: searchIndexName,
              compound: compound(filters, locale),
              ...(sortBy ? { sort: sortBy } : {}),
            },
          },
          {
            $facet: {
              items: [{ $skip: Math.max(0, page - 1) * plpPageSize }, { $limit: plpPageSize }],
              total: [{ $count: "count" }],
            },
          },
        ])
        .toArray();
      const facetResult = await facets(filters, locale);

      const facet = result[0];
      const total = facet?.total[0]?.count ?? 0;
      return {
        products: (facet?.items ?? []).map(toProduct),
        total,
        page,
        pageCount: Math.max(1, Math.ceil(total / plpPageSize)),
        facets: facetResult,
      };
    },
  };
}

export type SearchRepository = ReturnType<typeof createSearchRepository>;
