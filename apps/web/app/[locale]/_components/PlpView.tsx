// Vista PLP compartida (R11/R12): la usan /c/[...slug] y /search.
// Server Component: todo el estado sale de la URL; los links de faceta son GET
// reales — filtrar, ordenar y paginar funciona sin JavaScript.
import type { CardProduct } from "@nudo/commerce/card";
import { toCardProduct } from "@nudo/commerce/card";
import { colorById } from "@nudo/commerce/colors";
import type { Category } from "@nudo/commerce/catalog";
import type { Dictionary } from "@nudo/i18n/dictionaries";
import type { Locale } from "@nudo/i18n/config";
import { plural } from "@nudo/i18n/format";
import type { PlpPage } from "@nudo/data/repositories/search";
import { FacetPanel, type FacetGroupData } from "@nudo/ui/organisms/FacetPanel";
import { ProductGrid } from "@nudo/ui/organisms/ProductGrid";
import { Pagination } from "@nudo/ui/molecules/Pagination";
import { ViewToggle } from "@nudo/ui/molecules/ViewToggle";
import type { PlpPath, PlpState } from "../../../lib/plp";
import { plpHref, toggleInList } from "../../../lib/plp";
import { InfiniteGrid } from "./InfiniteGrid";
import styles from "./PlpView.module.scss";

export type PlpViewProps = {
  locale: Locale;
  t: Dictionary;
  path: PlpPath;
  state: PlpState;
  result: PlpPage;
  categories: readonly Category[];
  stock: Readonly<Record<string, number>>;
  /** Modo de paginación elegido por el usuario (R12). */
  view: "pagination" | "infinite";
};

const cardLabels = (t: Dictionary) => ({
  color: t.pdp.color,
  chooseColor: t.catalog.swatches.selectColor,
  soldOut: t.catalog.badges.soldOut,
  currentPrice: t.pdp.chooseOptions,
  previousPrice: t.pdp.chooseOptions,
  new: t.catalog.badges.new,
  sale: t.catalog.badges.sale,
  lastUnits: t.catalog.badges.lastUnits,
});

export function hrefForVariant(locale: Locale) {
  return (product: CardProduct, variantId: string) =>
    `/${locale}/p/${product.slug[locale]}?v=${variantId}`;
}

function initialVariantOf(product: Parameters<typeof toCardProduct>[0], colorId?: string) {
  if (colorId) {
    const match = product.variants.find((variant) => variant.id === colorId);
    if (match) return match.id;
  }
  return product.defaultVariantId;
}

export function PlpView({ locale, t, path, state, result, categories, stock, view }: PlpViewProps) {
  const c = t.catalog;
  const base = (next: Partial<PlpState>) => plpHref(locale, path, { ...state, ...next, page: 1 });
  const pageHref = (page: number) => `${plpHref(locale, path, { ...state, page })}#plp-results`;

  const categoryName = new Map(categories.map((cat) => [cat.id, cat.name[locale]]));
  const facetToggles: { param: "cat" | "color" | "size" | "brand" | "stock"; value: string }[] = [
    ...state.cats.map((value) => ({ param: "cat" as const, value })),
    ...state.colors.map((value) => ({ param: "color" as const, value })),
    ...state.sizes.map((value) => ({ param: "size" as const, value })),
    ...state.brands.map((value) => ({ param: "brand" as const, value })),
    ...(state.inStock ? [{ param: "stock" as const, value: "1" }] : []),
  ];

  const chipLabel = (param: string, value: string) => {
    if (param === "cat") return categoryName.get(value) ?? value;
    if (param === "color") return colorById(value)?.name[locale] ?? value;
    if (param === "brand") return value;
    if (param === "stock") return c.facets.inStock;
    return value;
  };
  const chipRemove = (param: string, value: string): PlpState => {
    const next = { ...state, page: 1 };
    if (param === "cat") next.cats = state.cats.filter((v) => v !== value);
    if (param === "color") next.colors = state.colors.filter((v) => v !== value);
    if (param === "size") next.sizes = state.sizes.filter((v) => v !== value);
    if (param === "brand") next.brands = state.brands.filter((v) => v !== value);
    if (param === "stock") next.inStock = false;
    return next;
  };

  const groups: FacetGroupData[] = [];
  if (path.kind === "search" && result.facets.categories.length > 0) {
    groups.push({
      key: "category",
      title: c.facets.category,
      options: result.facets.categories.map((bucket) => ({
        value: bucket.value,
        label: categoryName.get(bucket.value) ?? bucket.value,
        count: bucket.count,
        checked: state.cats.includes(bucket.value),
        disabled: false,
        href: base({ cats: toggleInList(state.cats, bucket.value) }),
      })),
    });
  }
  if (result.facets.colors.length > 0) {
    groups.push({
      key: "color",
      title: c.facets.color,
      options: result.facets.colors.map((bucket) => {
        const color = colorById(bucket.value);
        return {
          value: bucket.value,
          label: color?.name[locale] ?? bucket.value,
          count: bucket.count,
          checked: state.colors.includes(bucket.value),
          disabled: false,
          href: base({ colors: toggleInList(state.colors, bucket.value) }),
          hex: color?.hex,
        };
      }),
    });
  }
  if (result.facets.sizes.length > 0) {
    groups.push({
      key: "size",
      title: c.facets.size,
      options: result.facets.sizes.map((bucket) => ({
        value: bucket.value,
        label: bucket.value,
        count: bucket.count,
        checked: state.sizes.includes(bucket.value),
        disabled: false,
        href: base({ sizes: toggleInList(state.sizes, bucket.value) }),
      })),
    });
  }
  if (result.facets.brands.length > 0) {
    groups.push({
      key: "brand",
      title: c.facets.brand,
      options: result.facets.brands.map((bucket) => ({
        value: bucket.value,
        label: bucket.value,
        count: bucket.count,
        checked: state.brands.includes(bucket.value),
        disabled: false,
        href: base({ brands: toggleInList(state.brands, bucket.value) }),
      })),
    });
  }
  groups.push({
    key: "price",
    title: c.facets.price,
    options: [],
    price: {
      min: state.priceMinCents != null ? state.priceMinCents / 100 : undefined,
      max: state.priceMaxCents != null ? state.priceMaxCents / 100 : undefined,
      minLabel: c.priceRange.min,
      maxLabel: c.priceRange.max,
      applyLabel: c.priceRange.apply,
      hidden: [
        ...(state.q ? [{ name: "q", value: state.q }] : []),
        ...(state.cats.length ? [{ name: "cat", value: state.cats.join(",") }] : []),
        ...(state.colors.length ? [{ name: "color", value: state.colors.join(",") }] : []),
        ...(state.sizes.length ? [{ name: "size", value: state.sizes.join(",") }] : []),
        ...(state.brands.length ? [{ name: "brand", value: state.brands.join(",") }] : []),
        ...(state.inStock ? [{ name: "stock", value: "1" }] : []),
        ...(state.sort !== "relevance" ? [{ name: "sort", value: state.sort }] : []),
      ],
    },
  });
  groups.push({
    key: "stock",
    title: "",
    options: [
      {
        value: "1",
        label: c.facets.inStock,
        count: result.facets.inStockCount,
        checked: state.inStock,
        disabled: result.facets.inStockCount === 0 && !state.inStock,
        href: base({ inStock: !state.inStock }),
      },
    ],
  });

  const cards = result.products.map((product) => ({
    product: toCardProduct(product, stock),
    initialVariantId: initialVariantOf(product, state.colors[0]),
  }));

  const sortOptions = [
    { key: "relevance", label: c.sortOptions.relevance },
    { key: "price-asc", label: c.sortOptions["price-asc"] },
    { key: "price-desc", label: c.sortOptions["price-desc"] },
    { key: "newest", label: c.sortOptions.newest },
  ] as const;

  const countText = plural(locale, result.total, c.productCount);
  const withView = (href: string, mode: "pagination" | "infinite") =>
    `${href}${href.includes("?") ? "&" : "?"}view=${mode}`;

  return (
    <div className={styles.plp}>
      <div className={styles.toolbar}>
        <p className={styles.count} role="status">
          {state.q && (
            <>
              {c.resultsFor} “{state.q}” ·{" "}
            </>
          )}
          {countText}
        </p>
        <div className={styles.sorts}>
          <ViewToggle
            view={view}
            hrefs={{
              pagination: withView(base({}), "pagination"),
              infinite: withView(base({}), "infinite"),
            }}
            labels={{
              label: c.view.label,
              pagination: c.view.pagination,
              infinite: c.view.infinite,
            }}
          />
          <span className={styles.sortLabel}>{c.sort}:</span>
          {sortOptions.map((option) => (
            <a
              key={option.key}
              href={base({ sort: option.key as PlpState["sort"] })}
              className={state.sort === option.key ? styles.sortActive : undefined}
              aria-current={state.sort === option.key ? "true" : undefined}
            >
              {option.label}
            </a>
          ))}
        </div>
      </div>
      <div className={styles.body}>
        <aside className={styles.facets}>
          <FacetPanel
            groups={groups}
            activeChips={facetToggles.map((toggle) => ({
              label: chipLabel(toggle.param, toggle.value),
              href: plpHref(locale, path, chipRemove(toggle.param, toggle.value)),
              removeLabel: c.clearFilters,
            }))}
            clearHref={plpHref(locale, path, {
              cats: [],
              colors: [],
              sizes: [],
              brands: [],
              inStock: false,
              sort: state.sort,
              page: 1,
            })}
            clearLabel={c.clearFilters}
          />
        </aside>
        <section id="plp-results" className={styles.results} aria-label={c.filters}>
          {result.products.length === 0 ? (
            <div className={styles.empty}>
              <h2>{c.empty.title}</h2>
              <p>{c.empty.body}</p>
              <a
                className={styles.emptyCta}
                href={plpHref(locale, path, {
                  ...state,
                  cats: [],
                  colors: [],
                  sizes: [],
                  brands: [],
                  priceMinCents: undefined,
                  priceMaxCents: undefined,
                  inStock: false,
                  q: undefined,
                  page: 1,
                })}
              >
                {c.empty.clear}
              </a>
            </div>
          ) : view === "infinite" ? (
            <InfiniteGrid
              locale={locale}
              items={cards}
              query={new URL(plpHref(locale, path, { ...state, page: 1 }), "http://x").search.slice(
                1,
              )}
              pageCount={result.pageCount}
              labels={{
                loadMore: c.infinite.loadMore,
                loading: c.infinite.loading,
                card: cardLabels(t),
              }}
            />
          ) : (
            <>
              <ProductGrid
                products={cards}
                locale={locale}
                hrefForVariant={hrefForVariant(locale)}
                labels={cardLabels(t)}
                priorityCount={1}
              />
              <Pagination
                hrefFor={pageHref}
                page={result.page}
                pageCount={result.pageCount}
                labels={{
                  previous: c.pagination.previous,
                  next: c.pagination.next,
                  page: c.pagination.page,
                }}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
