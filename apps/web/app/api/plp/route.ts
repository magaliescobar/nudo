// API de páginas PLP para el scroll infinito (R12).
// Devuelve CardProduct[] JSON con la misma query canónica que la URL visible.
// Los datos salen de las mismas lecturas cacheadas que el SSR (getPlpPage).
import { NextResponse } from "next/server";
import { defaultLocale, isLocale } from "@nudo/i18n/config";
import { toCardProduct } from "@nudo/commerce/card";
import { parsePlpParams, stateToFilters } from "../../../lib/plp";
import { getPlpPage, getPlpStock } from "../../../lib/plp";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? defaultLocale;
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "bad-locale" }, { status: 400 });
  }
  const params: Record<string, string | undefined> = {};
  for (const [key, value] of url.searchParams) {
    if (key !== "locale") params[key] = value;
  }
  const state = parsePlpParams(params);
  const result = await getPlpPage(stateToFilters(state), locale, state.sort, state.page);
  const stock = await getPlpStock(result.products);
  const products = result.products.map((product) => toCardProduct(product, stock));
  return NextResponse.json(
    { products, page: result.page, pageCount: result.pageCount, total: result.total },
    { headers: { "cache-control": "private, no-store" } },
  );
}
