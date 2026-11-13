import { type NextRequest, NextResponse } from "next/server";
import { isLocale, localeCookie } from "@nudo/i18n/config";
import { negotiateLocale } from "@nudo/i18n/negotiate";

// R24: solo negociación de idioma para rutas sin prefijo. Sin auth ni lógica por IP.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isLocale(pathname.split("/")[1])) return NextResponse.next();

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
  // Excluye internos de Next, API y archivos con extensión (imágenes, robots.txt, llms.txt).
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
