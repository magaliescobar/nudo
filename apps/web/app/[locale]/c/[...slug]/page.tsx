import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { isLocale } from "@nudo/i18n/config";
import { getDictionary } from "@nudo/i18n/dictionaries";
import { PlpView } from "../../_components/PlpView";
import { parsePlpParams, plpHref, stateToFilters } from "../../../../lib/plp";
import { getCategories, getPlpPage, getPlpStock } from "../../../../lib/plp";
import { resolveCategoryPath, subtreeCategoryIds } from "../../../../lib/categories";

// `instant=false` + datos de request fuera de Suspense: la PLP es 100 % URL-driven
// y debe filtrar y
// paginar sin JavaScript — el HTML llega completo en vez de streameado (R11/R36).
// Resultados y facetas siguen cacheados con `use cache` + tags.
export const instant = false;

type Params = Promise<{ locale: string; slug: string[] }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Props = { params: Params; searchParams: SearchParams };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const resolved = await resolveCategoryPath(locale, slug);
  if (!resolved) return {};
  return { title: resolved.category.name[locale] };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  // `connection()` difiere el render al request: HTML íntegro sin JS. Los status
  // reales (404 de categoría, 307 canónico) los da la guarda de proxy.ts.
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

  return (
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
  );
}
