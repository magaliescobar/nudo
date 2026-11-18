import { getIndexableProducts } from "../../lib/catalog";
import { SITEMAP_PRODUCTS_PER_PAGE, sitemapIndex, XML_HEADERS } from "../../lib/sitemap";

// R29: índice de sitemaps por tipo. Los productos van paginados para escalar.
export async function GET() {
  const products = await getIndexableProducts();
  const productPages = Math.max(1, Math.ceil(products.length / SITEMAP_PRODUCTS_PER_PAGE));
  const files = [
    "/sitemaps/pages.xml",
    "/sitemaps/categories.xml",
    ...Array.from({ length: productPages }, (_, i) => `/sitemaps/products-${i + 1}.xml`),
  ];
  return new Response(sitemapIndex(files), { headers: XML_HEADERS });
}
