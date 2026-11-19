import { defaultLocale } from "@nudo/i18n/config";
import { getCategories, getIndexableProducts } from "../../../lib/catalog";
import { categoryPaths, homePaths, productPaths } from "../../../lib/seo";
import {
  SITEMAP_PRODUCTS_PER_PAGE,
  urlset,
  XML_HEADERS,
  type SitemapEntry,
} from "../../../lib/sitemap";

type Props = { params: Promise<{ file: string }> };

function xml(body: string) {
  return new Response(body, { headers: XML_HEADERS });
}

/**
 * R29: sitemaps por tipo (`/sitemaps/pages|categories|products-N.xml`), un <url>
 * por locale con hreflang recíproco + x-default. Solo URLs canónicas e indexables:
 * productos `active` (discontinued/draft excluidos por el repositorio), categorías
 * con su path canónico, home. `lastmod` sale de `updatedAt` real del documento.
 * La lectura es `use cache` + tag `catalog`: se invalida junto al catálogo.
 */
export async function GET(_req: Request, { params }: Props) {
  const { file } = await params;

  if (file === "pages.xml") {
    return xml(urlset([{ paths: homePaths() }]));
  }

  if (file === "categories.xml") {
    const categories = await getCategories();
    const entries: SitemapEntry[] = categories.map((category) => ({
      paths: categoryPaths(category, categories),
    }));
    return xml(urlset(entries));
  }

  const match = /^products-(\d+)\.xml$/.exec(file);
  if (match) {
    const page = Number(match[1]);
    const products = await getIndexableProducts();
    const slice = products.slice(
      (page - 1) * SITEMAP_PRODUCTS_PER_PAGE,
      page * SITEMAP_PRODUCTS_PER_PAGE,
    );
    if (slice.length === 0) return new Response("Not Found", { status: 404 });
    const entries: SitemapEntry[] = slice.map((product) => {
      const image = product.variants[0]?.images[0];
      return {
        paths: productPaths(product),
        lastmod: product.updatedAt,
        ...(image && { images: [{ src: image.src, title: image.alt[defaultLocale] }] }),
      };
    });
    return xml(urlset(entries));
  }

  return new Response("Not Found", { status: 404 });
}
