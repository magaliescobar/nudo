import "server-only";
import type { Category, Product } from "@nudo/commerce/catalog";
import { type Locale } from "@nudo/i18n/config";
import { categoryPath, productPaths, siteUrl } from "./seo";

// Tipos mínimos de schema.org que usa NUDO (R30). JSON-LD estricto y tipado a mano:
// evita la dependencia `schema-dts` y documenta exactamente qué emitimos.
export type JsonLdValue =
  string | number | boolean | null | JsonLdValue[] | { [key: string]: JsonLdValue };

export type JsonLdObject = { "@context"?: string; "@type": string } & Record<string, JsonLdValue>;

const escapeLd = (data: JsonLdObject): string => JSON.stringify(data).replace(/</g, "\\u003c");

/** `<script type="application/ld+json">` serializado de forma segura (`<` escapado). */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: escapeLd(data) }} />;
}

export function organizationJsonLd(siteName: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl(),
  };
}

export function webSiteJsonLd(locale: Locale, siteName: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl(),
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl()}/${locale}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  locale: Locale,
  items: readonly { name: string; path: string }[],
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl()}${item.path}`,
    })),
  };
}

export function itemListJsonLd(
  locale: Locale,
  products: readonly Pick<Product, "name" | "slug">[],
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name[locale],
      url: `${siteUrl()}/${locale}/p/${product.slug[locale]}`,
    })),
  };
}

/**
 * PDP: `ProductGroup` + `hasVariant` — una `Product` por SKU (color+talle),
 * `variesBy` color/talle, `offers` con precio, moneda y disponibilidad real (R30).
 */
export function productGroupJsonLd(
  locale: Locale,
  product: Product,
  stock: Record<string, number>,
  categories: readonly Category[],
): JsonLdObject {
  const paths = productPaths(product);
  const brand = { "@type": "Brand", name: product.brand };
  const category = categories
    .filter((c) => product.categoryIds.includes(c.id))
    .sort((a, b) => a.path.length - b.path.length)[0];
  const url = `${siteUrl()}${paths[locale]}`;
  const variants = product.variants.flatMap((variant) =>
    variant.skus.map((sku) => ({
      "@type": "Product",
      sku: sku.sku,
      color: variant.color.name[locale],
      size: sku.size,
      ...(variant.images[0] && { image: `${siteUrl()}${variant.images[0].src}` }),
      brand,
      offers: {
        "@type": "Offer",
        price: (sku.price.amountInCents / 100).toFixed(2),
        priceCurrency: sku.price.currency,
        availability:
          (stock[sku.sku] ?? 0) > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        url: `${url}?v=${variant.id}`,
      },
    })),
  );
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: product.name[locale],
    description: product.description[locale],
    brand,
    ...(category && {
      category: `${siteUrl()}${categoryPath(category, categories, locale)}`,
    }),
    url,
    variesBy: ["https://schema.org/color", "https://schema.org/size"],
    hasVariant: variants,
  };
}


