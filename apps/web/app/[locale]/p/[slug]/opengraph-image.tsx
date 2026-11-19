import { ImageResponse } from "next/og";
import { getDictionary } from "@nudo/i18n/dictionaries";
import { isLocale } from "@nudo/i18n/config";
import { getCategories, getProductBySlug } from "../../../../lib/catalog";
import { darkColor } from "../../../../lib/og-theme";

// R33: OG image dinámica del PDP — nombre, marca, categoría y precio desde,
// localizada por el segmento `[locale]`. Las lecturas son `use cache` +
// tag `catalog`: la imagen queda cacheada y se invalida con el producto.
// Los estilos van inline porque Satori no procesa CSS; los colores salen de
// los tokens (tema oscuro) via lib/og-theme.
export const alt = "NUDO";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ locale: string; slug: string }> };

const fmt = (cents: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);

export default async function Image({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return new Response("Not Found", { status: 404 });
  const [t, product, categories] = await Promise.all([
    getDictionary(locale),
    getProductBySlug(locale, slug),
    getCategories(),
  ]);
  if (!product || product.status !== "active") {
    return new Response("Not Found", { status: 404 });
  }
  const category = categories.find((c) => product.categoryIds.includes(c.id));
  const prices = product.variants.flatMap((v) => v.skus.map((s) => s.price.amountInCents));
  const min = Math.min(...prices);
  const currency = product.variants[0]!.skus[0]!.price.currency;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 64,
        background: darkColor("color-bg"),
        color: darkColor("color-text-primary"),
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: 8 }}>{t.meta.siteName}</span>
        {category && <span style={{ fontSize: 28, opacity: 0.7 }}>{category.name[locale]}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ fontSize: 28, opacity: 0.7 }}>{product.brand}</span>
        <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
          {product.name[locale]}
        </span>
      </div>
      <span style={{ fontSize: 40, fontWeight: 600, color: darkColor("color-sale") }}>
        {fmt(min, currency, locale)}
      </span>
    </div>,
    size,
  );
}
