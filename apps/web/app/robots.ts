import type { MetadataRoute } from "next";
import { locales } from "@nudo/i18n/config";
import { siteUrl } from "../lib/seo";

// R28: se bloquea el *rastreo* de lo privado/interno y de los parámetros de bajo
// valor (sort/view/img — su canonical apunta a la URL limpia, no hace falta
// rastrearlos). Las combinaciones de facetas NO se bloquean acá: si robots.txt
// impide el crawl, el bot nunca ve su `noindex` ni su canonical — la política
// de facetas se aplica vía meta robots en la página (indexablePlpState).
// Crawlers de entrenamiento de IA: bloqueados (ADR política de crawlers).
export default function robots(): MetadataRoute.Robots {
  const privateAreas = [
    "/api/",
    "/_next/",
    ...locales.flatMap((locale) => [
      `/${locale}/cart`,
      `/${locale}/checkout`,
      `/${locale}/order`,
    ]),
  ];
  const lowValueParams = ["/*?*sort=", "/*?*view=", "/*?*img="];
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...privateAreas, ...lowValueParams],
      },
      {
        userAgent: [
          "GPTBot",
          "CCBot",
          "ClaudeBot",
          "anthropic-ai",
          "Bytespider",
          "meta-externalagent",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
