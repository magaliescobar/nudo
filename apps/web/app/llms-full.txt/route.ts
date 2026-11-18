import { locales } from "@nudo/i18n/config";
import { getCategories, getIndexableProducts } from "../../lib/catalog";
import { categoryPath, siteUrl } from "../../lib/seo";

// R31 (opcional): /llms-full.txt — catálogo completo, un link por producto y locale.
export async function GET() {
  const [categories, products] = await Promise.all([getCategories(), getIndexableProducts()]);
  const lines: string[] = [
    "# NUDO — catálogo completo",
    "",
    `> ${products.length} productos activos, ${categories.length} categorías.`,
    "",
    "## Categorías",
    "",
  ];
  for (const category of categories) {
    for (const locale of locales) {
      lines.push(
        `- [${category.name[locale]} (${locale})](${siteUrl()}${categoryPath(category, categories, locale)})`,
      );
    }
  }
  lines.push("", "## Productos", "");
  for (const product of products) {
    for (const locale of locales) {
      lines.push(
        `- [${product.name[locale]} (${locale})](${siteUrl()}/${locale}/p/${product.slug[locale]}): ${product.description[locale]}`,
      );
    }
  }
  lines.push("");
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
