import { instanceId, resolveRequestId } from "@nudo/data/observability/context";
import { isLocale, localeCookie } from "@nudo/i18n/config";
import { negotiateLocale } from "@nudo/i18n/negotiate";
import { type NextRequest, NextResponse } from "next/server";

// R24: negociación de idioma para rutas sin prefijo. R04/R05: `x-instance-id` y `x-request-id`
// en cada respuesta (el id llega de la entrada de tráfico o se genera acá). Sin auth ni lógica por IP.
export async function proxy(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get("x-request-id"));
  const normalized = normalizeUrl(request);
  if (normalized) return normalized;
  const orderDenial = await guardOrderAccess(request);
  if (orderDenial) return orderDenial;
  const pageDenial = await guardPageAccess(request);
  if (pageDenial) return pageDenial;
  const response = route(request, requestId);
  response.headers.set("x-instance-id", instanceId);
  response.headers.set("x-request-id", requestId);
  return response;
}

// R17: la confirmación de pedido es privada (order number + token). Con Cache Components el
// shell PPR ya salió con 200 cuando la página podría hacer notFound(), así que el chequeo del
// token corre acá, antes del render, vía el endpoint interno guardado por secreto.
// Devuelve la respuesta 404/429/401 a enviar, o null si el request puede seguir.
async function guardOrderAccess(request: NextRequest): Promise<NextResponse | null> {
  const match = /^\/([^/]+)\/order\/([^/?#]+)$/.exec(request.nextUrl.pathname);
  if (!match || !isLocale(match[1])) return null;

  const number = match[2]!;
  const token = request.nextUrl.searchParams.get("token");
  const secret = process.env.INTERNAL_API_SECRET;
  if (!token || !secret) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Reenvía la IP del cliente para que el rate limit del endpoint interno sea por usuario.
  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";
  const check = await fetch(
    new URL(
      `/api/internal/order-access?number=${encodeURIComponent(number)}&token=${encodeURIComponent(token)}`,
      request.nextUrl.origin,
    ),
    {
      headers: {
        authorization: `Bearer ${secret}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  ).catch(() => null);
  if (!check) return new NextResponse("Service Unavailable", { status: 503 });
  if (check.status === 204) return null;
  if (check.status === 404) return new NextResponse("Not Found", { status: 404 });
  // 429/401/5xx del guard: fail-closed, no se revela nada del pedido.
  return new NextResponse("Service Unavailable", { status: 503 });
}

// R11/R14/R16: PDP, PLP de categoría y pasos del checkout necesitan status reales
// (404 de slug/categoría/paso inexistente, 307 de guardas de checkout). Con Cache
// Components cualquier notFound()/redirect() dentro de la página corre después de
// que el shell salió con 200, así que la validación va acá, antes del render.
// Solo en document requests: las navegaciones cliente (RSC) y prefetches no
// necesitan status HTTP — el router muestra la UI de not-found streameada.
// Fail-open: si el endpoint interno no responde, la página renderiza igual y sus
// propios guardas quedan de respaldo (a diferencia del pedido, nada es privado).
async function guardPageAccess(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const match = /^\/([^/]+)\/(p|c|checkout)\/(.+)$/.exec(pathname);
  if (!match || !isLocale(match[1])) return null;
  // Fetch/RSC/prefetch y Server Actions van con `sec-fetch-dest: empty`;
  // solo los documentos (carga directa, crawlers, curl) necesitan status real.
  const dest = request.headers.get("sec-fetch-dest");
  if ((dest != null && dest !== "document") || request.headers.has("next-action")) {
    return null;
  }

  const locale = match[1]!;
  const section = match[2]!;
  const rest = match[3]!;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return null;

  let kind: string;
  let value: string;
  if (section === "p") {
    // El slug es un solo segmento; `/p/{slug}/opengraph-image` y similares no
    // pasan por el guard (las resuelve su propio handler).
    if (rest.includes("/")) return null;
    kind = "product";
    value = rest;
  } else if (section === "c") {
    kind = "category";
    value = rest;
  } else {
    // /checkout/{step}: solo el primer segmento es el paso.
    const step = rest.split("/")[0]!;
    if (rest.includes("/")) return null;
    kind = "checkout";
    value = step;
  }

  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";
  const cookie = request.headers.get("cookie") ?? "";
  const check = await fetch(
    new URL(
      `/api/internal/page-guard?kind=${kind}&locale=${encodeURIComponent(locale)}&value=${encodeURIComponent(value)}`,
      request.nextUrl.origin,
    ),
    {
      headers: {
        authorization: `Bearer ${secret}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
        ...(cookie ? { cookie } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  ).catch(() => null);
  if (!check) return null; // fail-open: la página decide con sus propios guardas.
  if (check.status === 404) return new NextResponse("Not Found", { status: 404 });
  if (check.status === 204) return null;
  if (check.status === 200) {
    const body = (await check.json().catch(() => null)) as {
      redirect?: string;
      status?: number;
    } | null;
    if (body?.redirect?.startsWith(`/${locale}/`)) {
      // 301/308 vienen de la tabla Redirect (slugs viejos); 307 es guarda de checkout.
      const status = body.status === 301 || body.status === 308 ? body.status : 307;
      return NextResponse.redirect(new URL(body.redirect, request.nextUrl.origin), status);
    }
  }
  return null;
}

// R32: normalización de URLs canónicas — sin trailing slash, path en minúsculas
// y sin query params basura (solo se conservan los conocidos). 301 permanente.
// Parámetros con semántica en la app; el resto se considera basura y se quita
// con 301 (utm_*, trackers, typos). Facetas: cat/color/size/brand/pmin/pmax/stock.
const KNOWN_PARAMS = new Set([
  "q",
  "page",
  "sort",
  "view",
  "v",
  "img",
  "e",
  "token",
  "cat",
  "color",
  "size",
  "brand",
  "pmin",
  "pmax",
  "stock",
]);

function normalizeUrl(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  // Solo rutas públicas indexables: APIs/assets tienen sus propios params y las
  // privadas (order/checkout/cart) llevan IDs case-sensitive — normalizar su
  // case rompería el pedido (regresión detectada en tests).
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || /\.[^/]+$/.test(pathname)) {
    return null;
  }
  const segments = pathname.split("/");
  if (!isLocale((segments[1] ?? "").toLowerCase())) return null;
  const section = segments[2]?.toLowerCase();
  if (section !== undefined && !["p", "c", "search"].includes(section)) return null;

  const dest = request.headers.get("sec-fetch-dest");
  if (dest != null && dest !== "document") return null; // RSC/prefetch: no tocar.

  const lower = pathname.toLowerCase();
  const stripped = lower.length > 1 && lower.endsWith("/") ? lower.slice(0, -1) : lower;
  const garbage = [...searchParams.keys()].filter((key) => !KNOWN_PARAMS.has(key));

  if (stripped === pathname && garbage.length === 0) return null;
  const url = request.nextUrl.clone();
  url.pathname = stripped;
  for (const key of garbage) url.searchParams.delete(key);
  return NextResponse.redirect(url, 301);
}

function route(request: NextRequest, requestId: string) {
  const { pathname } = request.nextUrl;
  const passThrough = () => {
    const headers = new Headers(request.headers);
    headers.set("x-request-id", requestId);
    return NextResponse.next({ request: { headers } });
  };

  // API y archivos con extensión (imágenes, robots.txt, llms.txt) no se negocian.
  if (pathname.startsWith("/api/") || /\.[^/]+$/.test(pathname)) return passThrough();
  if (isLocale(pathname.split("/")[1])) return passThrough();

  const locale = negotiateLocale({
    cookie: request.cookies.get(localeCookie)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  const response = NextResponse.redirect(url, 307);
  response.headers.set("Vary", "Cookie, Accept-Language");
  return response;
}

export const config = {
  // Todo salvo assets inmutables de Next (que ya llevan `?dpl=` y Cache-Control propio).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
