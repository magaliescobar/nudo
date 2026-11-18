import "server-only";
import { tags } from "@nudo/data/cache/tags";
import { measure } from "@nudo/data/observability/context";
import { getRepositories } from "@nudo/data/repositories";
import type { PlpFilters, PlpSort } from "@nudo/data/repositories/search";
import { isPlpSort, plpPageSize } from "@nudo/data/repositories/search";
import type { Locale } from "@nudo/i18n/config";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { getCategories, getStock } from "./catalog";

// Estado de la PLP 100 % en URL (R11). Orden de parámetros FIJO y valores múltiples
// ordenados: mismo filtro ⇒ misma URL canónica sin importar el orden de los clicks.
export type PlpState = {
  readonly q?: string;
  readonly cats: readonly string[];
  readonly colors: readonly string[];
  readonly sizes: readonly string[];
  readonly brands: readonly string[];
  readonly priceMinCents?: number;
  readonly priceMaxCents?: number;
  readonly inStock: boolean;
  readonly sort: PlpSort;
  readonly page: number;
};

const csv = (value: string | string[] | undefined): string[] =>
  (Array.isArray(value) ? value : (value ?? "").split(","))
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

const dollarsToCents = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
};

export function parsePlpParams(
  searchParams: Record<string, string | string[] | undefined>,
): PlpState {
  const pageRaw = Number(
    Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page,
  );
  const sortRaw = Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort;
  const qRaw = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const q = qRaw?.trim().slice(0, 120);
  return {
    ...(q ? { q } : {}),
    cats: csv(searchParams.cat),
    colors: csv(searchParams.color),
    sizes: csv(searchParams.size),
    brands: csv(searchParams.brand),
    priceMinCents: dollarsToCents(
      Array.isArray(searchParams.pmin) ? searchParams.pmin[0] : searchParams.pmin,
    ),
    priceMaxCents: dollarsToCents(
      Array.isArray(searchParams.pmax) ? searchParams.pmax[0] : searchParams.pmax,
    ),
    inStock:
      (Array.isArray(searchParams.stock) ? searchParams.stock[0] : searchParams.stock) === "1",
    sort: isPlpSort(sortRaw) ? sortRaw : "relevance",
    page: Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

export function stateToFilters(state: PlpState, categoryIds?: readonly string[]): PlpFilters {
  const cats = categoryIds?.length ? categoryIds : state.cats;
  return {
    ...(cats.length ? { categoryIds: cats } : {}),
    ...(state.colors.length ? { colors: state.colors } : {}),
    ...(state.sizes.length ? { sizes: state.sizes } : {}),
    ...(state.brands.length ? { brands: state.brands } : {}),
    ...(state.priceMinCents != null ? { priceMinCents: state.priceMinCents } : {}),
    ...(state.priceMaxCents != null ? { priceMaxCents: state.priceMaxCents } : {}),
    ...(state.inStock ? { inStock: true } : {}),
    ...(state.q ? { q: state.q } : {}),
  };
}

export type PlpPath =
  { readonly kind: "category"; readonly segments: readonly string[] } | { readonly kind: "search" };

/** URL canónica: parámetros en orden fijo, `page` solo si > 1, `sort` solo si no es default. */
export function plpHref(locale: Locale, path: PlpPath, state: PlpState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.cats.length) params.set("cat", [...state.cats].sort().join(","));
  if (state.colors.length) params.set("color", [...state.colors].sort().join(","));
  if (state.sizes.length) params.set("size", [...state.sizes].sort().join(","));
  if (state.brands.length) params.set("brand", [...state.brands].sort().join(","));
  if (state.priceMinCents != null) params.set("pmin", String(state.priceMinCents / 100));
  if (state.priceMaxCents != null) params.set("pmax", String(state.priceMaxCents / 100));
  if (state.inStock) params.set("stock", "1");
  if (state.sort !== "relevance") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));

  const base =
    path.kind === "category" ? `/${locale}/c/${path.segments.join("/")}` : `/${locale}/search`;
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/** Helper para togglear un valor dentro de una faceta multi-valor. */
export function toggleInList(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value].sort();
}

// ---------- Carga cacheada ----------

/** JSON con claves ordenadas: misma combinación de filtros ⇒ misma clave de caché. */
function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function loadPlp(payload: string, locale: Locale, sort: PlpSort, page: number) {
  "use cache";
  cacheLife("catalog");
  cacheTag(tags.catalog, tags.locale(locale));
  const filters = JSON.parse(payload) as PlpFilters;
  // Tags finos por categoría para invalidar solo las PLP afectadas.
  for (const id of filters.categoryIds ?? []) cacheTag(tags.category(id));
  const result = await measure("mongo", async () =>
    (await getRepositories()).search.plp(filters, locale, sort, page),
  );
  for (const product of result.products) {
    cacheTag(tags.product(product.id), ...product.categoryIds.map(tags.category));
  }
  return result;
}

export const getPlpPage = cache(
  async (filters: PlpFilters, locale: Locale, sort: PlpSort, page: number) =>
    measure("catalog", () => loadPlp(canonicalStringify(filters), locale, sort, page)),
);

/** Stock de todos los SKUs de una página de PLP (perfil `stock`, aislado del catálogo). */
export async function getPlpStock(
  products: readonly {
    variants: readonly { skus: readonly { sku: string }[] }[];
  }[],
) {
  const skus = [
    ...new Set(products.flatMap((p) => p.variants.flatMap((v) => v.skus.map((s) => s.sku)))),
  ];
  return getStock(skus);
}

export { getCategories, plpPageSize };
