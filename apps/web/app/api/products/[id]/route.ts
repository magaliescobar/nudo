import {
  cacheStatusOf,
  getRequestContext,
  logEvent,
  resolveRequestId,
  serverTimingHeader,
  withRequestContext,
} from "@nudo/data/observability/context";
import { type NextRequest, NextResponse } from "next/server";
import { getProductById, getStock } from "../../../../lib/catalog";

// Ficha pública + stock por SKU (JSON). Datos públicos: cacheable en CDN con el perfil `stock`.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = resolveRequestId(request.headers.get("x-request-id"));

  return withRequestContext({ requestId, route: "/api/products/[id]" }, async () => {
    const product = await getProductById(id);
    const headers = new Headers({ "x-request-id": requestId });
    let status = 200;
    let body: unknown = { error: "not_found" };

    if (product) {
      const stock = await getStock(product.variants.flatMap((v) => v.skus.map((s) => s.sku)));
      body = { product, stock };
      headers.set("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=30");
    } else {
      status = 404;
      headers.set("Cache-Control", "public, max-age=0, s-maxage=60");
    }

    const context = getRequestContext();
    if (context) {
      headers.set("Server-Timing", serverTimingHeader(context));
      logEvent("info", "product.read", { productId: id, status, cache: cacheStatusOf(context) });
    }
    return NextResponse.json(body, { status, headers });
  });
}
