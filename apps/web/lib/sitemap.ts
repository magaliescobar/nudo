import "server-only";
import { defaultLocale, locales, type Locale } from "@nudo/i18n/config";
import { siteUrl } from "./seo";

const xmlEscape = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type SitemapImage = { readonly src: string; readonly title: string };

export type SitemapEntry = {
  /** Paths relativos por locale; el entry genera un <url> por locale con hreflang recíproco. */
  readonly paths: Record<Locale, string>;
  readonly lastmod?: Date;
  readonly images?: readonly SitemapImage[];
};

function alternatesBlock(paths: Record<Locale, string>): string {
  const links = locales
    .map(
      (l) =>
        `    <xhtml:link rel="alternate" hreflang="${l}" href="${xmlEscape(`${siteUrl()}${paths[l]}`)}"/>`,
    )
    .join("\n");
  const fallback = `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(`${siteUrl()}${paths[defaultLocale]}`)}"/>`;
  return `${links}\n${fallback}`;
}

/** Un <url> por locale (el hreflang recíproco incluye x-default). */
export function urlset(entries: readonly SitemapEntry[]): string {
  const urls = entries
    .flatMap((entry) =>
      locales.map(
        (l) => `  <url>
    <loc>${xmlEscape(`${siteUrl()}${entry.paths[l]}`)}</loc>
${entry.lastmod ? `    <lastmod>${entry.lastmod.toISOString()}</lastmod>\n` : ""}${alternatesBlock(
          entry.paths,
        )}${
          entry.images
            ? entry.images
                .map(
                  (img) =>
                    `\n    <image:image><image:loc>${xmlEscape(`${siteUrl()}${img.src}`)}</image:loc><image:title>${xmlEscape(
                      img.title,
                    )}</image:title></image:image>`,
                )
                .join("")
            : ""
        }
  </url>`,
      ),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;
}

export function sitemapIndex(files: readonly string[]): string {
  const entries = files
    .map(
      (file) => `  <sitemap>
    <loc>${xmlEscape(`${siteUrl()}${file}`)}</loc>
  </sitemap>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
}

/** Tamaño de página de los sitemaps de producto (R29: preparado para catálogos grandes). */
export const SITEMAP_PRODUCTS_PER_PAGE = 200;

export const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
} as const;
