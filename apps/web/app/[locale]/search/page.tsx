import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { isLocale } from "@nudo/i18n/config";
import { getDictionary } from "@nudo/i18n/dictionaries";
import { PlpView } from "../_components/PlpView";
import { parsePlpParams, plpHref, stateToFilters } from "../../../lib/plp";
import { getCategories, getPlpPage, getPlpStock } from "../../../lib/plp";

// `instant=false` + datos de request fuera de Suspense: la PLP es 100 % URL-driven
// (searchParams) y debe
// filtrar/paginar sin JavaScript — el HTML llega completo, no streameado (R11/R36).
// Los resultados y facetas siguen cacheados con `use cache` + tags.
export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getDictionary(locale);
  return { title: t.catalog.searchPlaceholder };
}

export default async function SearchPage({ params, searchParams }: Props) {
  // `connection()` difiere el render al request: HTML completo sin JS y redirect
  // real (307) cuando la página pedida excede pageCount.
  await connection();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [t, sp] = await Promise.all([getDictionary(locale), searchParams]);
  const state = parsePlpParams(sp);
  const view = sp.view === "infinite" ? "infinite" : "pagination";

  const result = await getPlpPage(stateToFilters(state), locale, state.sort, state.page);
  if (result.total > 0 && state.page > result.pageCount) {
    redirect(plpHref(locale, { kind: "search" }, { ...state, page: result.pageCount }));
  }
  const [categories, stock] = await Promise.all([getCategories(), getPlpStock(result.products)]);

  return (
    <PlpView
      locale={locale}
      t={t}
      path={{ kind: "search" }}
      state={state}
      result={result}
      categories={categories}
      stock={stock}
      view={view}
    />
  );
}
