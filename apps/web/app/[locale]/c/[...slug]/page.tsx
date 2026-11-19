import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { defaultLocale, isLocale } from "@nudo/i18n/config";
import { getDictionary } from "@nudo/i18n/dictionaries";
import { PlpView } from "../../_components/PlpView";
import { parsePlpParams, plpHref, stateToFilters } from "../../../../lib/plp";
import { getCategories, getPlpPage, getPlpStock } from "../../../../lib/plp";
import {
  categoryBreadcrumbs,
  resolveCategoryPath,
  subtreeCategoryIds,
} from "../../../../lib/categories";
import { categoryPaths, indexablePlpState } from "../../../../lib/seo";
import { breadcrumbJsonLd, itemListJsonLd, JsonLd } from "../../../../lib/jsonld";

// `instant=false` + datos de request fuera de Suspense: la PLP es 100 % URL-driven
// y debe filtrar y
// paginar sin JavaScript — el HTML llega completo en vez de streameado (R11/R36).
// Resultados y facetas siguen cacheados con `use cache` + tags.
export const instant = false;

type Params = Promise<{ locale: string; slug: string[] }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Props = { params: Params; searchParams: SearchParams };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const [resolved, categories, sp] = await Promise.all([
    resolveCategoryPath(locale, slug),
    getCategories(),
    searchParams,
  ]);
  if (!resolved) return {};
  const state = parsePlpParams(sp);
  const paths = categoryPaths(resolved.category, categories);
  // R27/R28: canonical = la URL normalizada propia (facetas + page, sin `view`);
  // hreflang apunta a la categoría sin facetas en cada idioma (los valores de
  // faceta son localizados). La política de facetas marca noindex el resto.
  const alternates = {
    canonical: plpHref(locale, { kind: "category", segments: resolved.canonicalSegments }, state),
    languages: { ...paths, "x-default": paths[defaultLocale] },
  };
  const index = indexablePlpState(state);
  return {
    title: resolved.category.name[locale],
    alternates,
    ...(index ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title: resolved.category.name[locale],
      url: alternates.canonical,
      // R33: og:image dinámica — route handler propio porque la convención
      // `opengraph-image` no admite catch-all. Cacheada por path via use cache.
      images: [
        {
          url: `/${locale}/og/category/${resolved.canonicalSegments.join("/")}`,
          width: 1200,
          height: 630,
          alt: resolved.category.name[locale],
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  // El render ya es por request (searchParams de facetas/página); `connection()`
  // queda como refuerzo explícito ante refactors. Los status reales (404 de
  // categoría, 307 canónico) los da la guarda de proxy.ts.
  await connection();
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const resolved = await resolveCategoryPath(locale, slug);
  if (!resolved) notFound();

  // URL no canónica (orden/segmentos distintos) ⇒ redirect permanente.
  const canonical = `/${locale}/c/${resolved.canonicalSegments.join("/")}`;
  const requested = `/${locale}/c/${slug.join("/")}`;
  if (canonical !== requested) redirect(canonical);

  const [t, sp, categories] = await Promise.all([
    getDictionary(locale),
    searchParams,
    getCategories(),
  ]);
  const state = parsePlpParams(sp);
  const view = sp.view === "infinite" ? "infinite" : "pagination";
  const categoryIds = subtreeCategoryIds(resolved.category, categories);

  const result = await getPlpPage(
    stateToFilters(state, categoryIds),
    locale,
    state.sort,
    state.page,
  );
  if (result.total > 0 && state.page > result.pageCount) {
    redirect(
      plpHref(
        locale,
        { kind: "category", segments: resolved.canonicalSegments },
        { ...state, page: result.pageCount },
      ),
    );
  }
  const stock = await getPlpStock(result.products);

  const crumbs = categoryBreadcrumbs(resolved, categories);
  const jsonLdCrumbs = [
    { name: t.nav.shop, path: `/${locale}` },
    ...crumbs.map((crumb) => ({
      name: crumb.category.name[locale],
      path: `/${locale}/c/${crumb.segments.join("/")}`,
    })),
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(locale, jsonLdCrumbs)} />
      <JsonLd data={itemListJsonLd(locale, result.products)} />
      <PlpView
        locale={locale}
        t={t}
        path={{ kind: "category", segments: resolved.canonicalSegments }}
        state={state}
        result={result}
        categories={categories}
        stock={stock}
        view={view}
      />
    </>
  );
}
