import { locales } from "@nudo/i18n/config";
import { getCategories, getIndexableProducts } from "../../lib/catalog";
import { categoryPath, siteUrl } from "../../lib/seo";

// R31: /llms.txt estilo llmstxt.org — una sección por locale (idiomas separados
// para que un crawler pueda filtrar), links absolutos canónicos. Datos via
// `use cache` + tag `catalog`: se invalida junto al catálogo.
export async function GET() {
  const [categories, products] = await Promise.all([getCategories(), getIndexableProducts()]);
  const featured = products.slice(0, 10);
  const lines: string[] = [
    "# NUDO",
    "",
    "> NUDO es una mini-tienda de comercio electrónico bilingüe (es/en).",
    "> Catálogo de indumentaria con PDPs, categorías, carrito de invitado y checkout.",
    "",
    "## Policy",
    "",
    `- Public catalog pages: ${locales.map((l) => `${siteUrl()}/${l}`).join(", ")}`,
    "- Cart, checkout, order confirmation and internal search are private/non-indexable.",
    "- Category PLPs are indexable; filtered/faceted combinations are crawlable but canonicalize.",
    "",
  ];
  for (const locale of locales) {
    lines.push(`## Catálogo (${locale})`, "");
    for (const category of categories.filter((c) => c.path.length === 1)) {
      lines.push(
        `- [${category.name[locale]}](${siteUrl()}${categoryPath(category, categories, locale)})`,
      );
    }
    lines.push("", `### Destacados (${locale})`, "");
    for (const product of featured) {
      lines.push(
        `- [${product.name[locale]}](${siteUrl()}/${locale}/p/${product.slug[locale]}): ${product.description[locale].slice(0, 120)}`,
      );
    }
    lines.push("");
  }
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
