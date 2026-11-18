import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isLocale, type Locale } from "@nudo/i18n/config";
import { getDictionary } from "@nudo/i18n/dictionaries";
import { Breadcrumbs } from "@nudo/ui/molecules/Breadcrumbs";
import { ProductGallery } from "@nudo/ui/organisms/ProductGallery";
import { ProductGrid } from "@nudo/ui/organisms/ProductGrid";
import { VariantSelector } from "@nudo/ui/organisms/VariantSelector";
import { toCardProduct } from "@nudo/commerce/card";
import { getCategories, getProductBySlug, getStock } from "../../../../lib/catalog";
import { getPlpPage, getPlpStock } from "../../../../lib/plp";
import { addToCartPdp } from "../../../../lib/actions/cart";
import { localizedAlternates, productPaths, categoryPath } from "../../../../lib/seo";
import { breadcrumbJsonLd, JsonLd, productGroupJsonLd } from "../../../../lib/jsonld";
import styles from "./page.module.scss";

// `instant=false` + datos de request fuera de Suspense: la PDP lee ?v/?img
// (searchParams), stock y la
// sesión del carrito — todo depende de la request y el add-to-cart debe funcionar
// sin JavaScript, así que el HTML llega completo en vez de streameado (R14/R36).
export const instant = false;

type Params = Promise<{ locale: string; slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Props = { params: Params; searchParams: SearchParams };

async function load(locale: Locale, slug: string) {
  const product = await getProductBySlug(locale, slug);
  if (!product || product.status === "draft") return null;
  return product;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const product = await load(locale, slug);
  if (!product) return {};
  // Política de canonical (R14/ADR 020): una URL canónica por producto; la variante
  // viaja en ?v= y no genera URLs alternativas indexables.
  const alternates = localizedAlternates(locale, productPaths(product));
  return {
    title: product.name[locale],
    description: product.description[locale],
    alternates,
    // R32/ADR: discontinued sigue sirviendo 200 (los enlaces viejos funcionan)
    // pero sale del índice, del sitemap y de la PLP; su Offer queda OutOfStock.
    ...(product.status === "discontinued" && { robots: { index: false } }),
    // og:image sale de opengraph-image.tsx (R33, tarjeta dinámica con precio/marca);
    // twitter cae en og:image por convención de la spec.
    openGraph: {
      title: product.name[locale],
      description: product.description[locale],
      url: alternates.canonical,
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function PdpPage({ params, searchParams }: Props) {
  // El render ya es por request (searchParams `?v`/`?i`); `connection()` queda
  // como refuerzo explícito ante refactors. El 404 de slugs inexistentes ya lo
  // resolvió proxy.ts (guarda page-guard) antes del render.
  await connection();
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const [t, sp] = await Promise.all([getDictionary(locale), searchParams]);
  const product = await load(locale, slug);
  if (!product) notFound();

  const variantParam = Array.isArray(sp.v) ? sp.v[0] : sp.v;
  const variant =
    product.variants.find((v) => v.id === variantParam) ??
    product.variants.find((v) => v.id === product.defaultVariantId) ??
    product.variants[0]!;
  const imgParam = Number(Array.isArray(sp.img) ? sp.img[0] : sp.img);
  const activeImage =
    Number.isInteger(imgParam) && imgParam >= 0 && imgParam < variant.images.length ? imgParam : 0;

  const allSkus = product.variants.flatMap((v) => v.skus.map((s) => s.sku));
  const stock = await getStock(allSkus);
  const categories = await getCategories();
  const category = categories.find((c) => product.categoryIds.includes(c.id));

  const sizes = variant.skus.map((sku) => ({
    value: sku.size,
    available: stock[sku.sku] ?? 0,
  }));
  const available = variant.skus.reduce((sum, sku) => sum + Math.max(0, stock[sku.sku] ?? 0), 0);
  const cheapestSku = variant.skus.reduce((min, sku) =>
    sku.price.amountInCents < min.price.amountInCents ? sku : min,
  );
  // Talle por defecto: el primero con stock (sin JS el radio queda marcado y el
  // POST lleva `size`; con JS el usuario puede cambiarlo).
  const selectedSize = sizes.find((size) => size.available > 0)?.value ?? sizes[0]?.value;
  const pdpHref = (vId: string, img?: number) =>
    `/${locale}/p/${product.slug[locale]}?v=${vId}${img != null ? `&img=${img}` : ""}`;

  const related = await getPlpPage({ categoryIds: product.categoryIds }, locale, "relevance", 1);
  const relatedProducts = related.products.filter((p) => p.id !== product.id).slice(0, 4);
  const relatedStock = await getPlpStock(relatedProducts);
  const relatedCards = relatedProducts.map((p) => ({
    product: toCardProduct(p, relatedStock),
    initialVariantId: p.defaultVariantId,
  }));

  const crumbs = [
    { label: t.pdp.breadcrumbsHome, href: `/${locale}` },
    ...(category
      ? [{ label: category.name[locale], href: `/${locale}/c/${category.slug[locale]}` }]
      : []),
    { label: product.name[locale] },
  ];

  const jsonLdItems = [
    { name: t.pdp.breadcrumbsHome, path: `/${locale}` },
    ...(category
      ? [{ name: category.name[locale], path: categoryPath(category, categories, locale) }]
      : []),
    { name: product.name[locale], path: `/${locale}/p/${product.slug[locale]}` },
  ];

  return (
    <div className={styles.pdp}>
      <JsonLd data={breadcrumbJsonLd(locale, jsonLdItems)} />
      <JsonLd data={productGroupJsonLd(locale, product, stock, categories)} />
      <Breadcrumbs items={crumbs} label={t.pdp.breadcrumbsHome} />
      <div className={styles.layout}>
        <ProductGallery
          images={variant.images.map((image) => ({
            src: image.src,
            alt: image.alt[locale],
            width: image.width,
            height: image.height,
          }))}
          activeIndex={activeImage}
          hrefFor={(index: number) => pdpHref(variant.id, index)}
          labels={{ gallery: t.pdp.color, imageOf: t.pdp.imageOf }}
        />
        <div className={styles.info}>
          <p className={styles.brand}>{product.brand}</p>
          <h1 className={styles.name}>{product.name[locale]}</h1>
          <p className={styles.description}>{product.description[locale]}</p>
          <VariantSelector
            colorLegend={t.pdp.color}
            sizeLegend={t.pdp.size}
            locale={locale}
            variants={product.variants.map((v) => ({
              id: v.id,
              colorName: v.color.name[locale],
              colorHex: v.color.hex,
              hasStock: v.skus.some((sku) => (stock[sku.sku] ?? 0) > 0),
              href: pdpHref(v.id, activeImage),
            }))}
            selectedColorId={variant.id}
            sizes={sizes}
            selectedSize={selectedSize}
            price={cheapestSku.price}
            compareAt={cheapestSku.compareAtPrice}
            stockLabel={t.pdp.chooseOptions}
            soldOutLabel={t.pdp.outOfStock}
            lowStockLabel={t.catalog.badges.lastUnits}
            available={available}
            addLabel={t.pdp.addToCart}
            labels={{
              soldOut: t.pdp.outOfStock,
              chooseColor: t.catalog.swatches.selectColor,
            }}
            hiddenInputs={[
              { name: "productId", value: product.id },
              { name: "variantId", value: variant.id },
            ]}
            action={addToCartPdp}
          />
          {product.status === "discontinued" && (
            <p className={styles.discontinued} role="status">
              {t.pdp.discontinued}
            </p>
          )}
        </div>
      </div>
      {relatedCards.length > 0 && (
        <section className={styles.related} aria-labelledby="related-title">
          <h2 id="related-title">{t.pdp.related}</h2>
          <ProductGrid
            products={relatedCards}
            locale={locale}
            hrefForVariant={(p, vId) => `/${locale}/p/${p.slug[locale]}?v=${vId}`}
            labels={{
              color: t.pdp.color,
              chooseColor: t.catalog.swatches.selectColor,
              soldOut: t.catalog.badges.soldOut,
              currentPrice: t.pdp.chooseOptions,
              previousPrice: t.pdp.chooseOptions,
            }}
          />
        </section>
      )}
    </div>
  );
}
