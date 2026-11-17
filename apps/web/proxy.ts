import { instanceId, resolveRequestId } from "@nudo/data/observability/context";
import { isLocale, localeCookie } from "@nudo/i18n/config";
import { negotiateLocale } from "@nudo/i18n/negotiate";
import { type NextRequest, NextResponse } from "next/server";

// R24: negociación de idioma para rutas sin prefijo. R04/R05: `x-instance-id` y `x-request-id`
// en cada respuesta (el id llega de la entrada de tráfico o se genera acá). Sin auth ni lógica por IP.
export function proxy(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get("x-request-id"));
  const response = route(request, requestId);
  response.headers.set("x-instance-id", instanceId);
  response.headers.set("x-request-id", requestId);
  return response;
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
