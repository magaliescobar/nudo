// Últimas unidades (R10): bloque dependiente de stock con perfil `stock` (30 s).
// Se carga en su propio <Suspense>: nunca bloquea hero/categorías/novedades.
// `connection()` lo difiere a request time: es la sección que realmente streamea
// (su dato más volátil es el stock), con skeleton propio (R21).
import { connection } from "next/server";
import type { Locale } from "@nudo/i18n/config";
import type { Dictionary } from "@nudo/i18n/dictionaries";
import { ProductGrid } from "@nudo/ui/organisms/ProductGrid";
import { toCardProduct } from "@nudo/commerce/card";
import { getPlpPage, getPlpStock } from "../../../lib/plp";
import { hrefForVariant } from "./PlpView";
import styles from "../page.module.scss";

const LAST_UNITS_THRESHOLD = 8;

export async function LastUnits({ locale, t }: { locale: Locale; t: Dictionary }) {
  await connection();
  const result = await getPlpPage({ inStock: true }, locale, "newest", 1);
  const stock = await getPlpStock(result.products);
  // "Últimas unidades" = productos activos cuyo stock total está por debajo del umbral.
  const cards = result.products
    .map((product) => {
      const card = toCardProduct(product, stock);
      const total = product.variants
        .flatMap((v) => v.skus)
        .reduce((sum, sku) => sum + Math.max(0, stock[sku.sku] ?? 0), 0);
      return { product: card, initialVariantId: product.defaultVariantId, total };
    })
    .filter((item) => item.total > 0 && item.total <= LAST_UNITS_THRESHOLD)
    .slice(0, 8)
    .map(({ product, initialVariantId }) => ({ product, initialVariantId }));
  if (cards.length === 0) return null;
  return (
    <section aria-labelledby="last-title" className={styles["home-section"]}>
      <h2 id="last-title">{t.home.lastUnits}</h2>
      <ProductGrid
        vtNamePrefix="last-units"
        products={cards}
        locale={locale}
        hrefForVariant={hrefForVariant(locale)}
        labels={{
          color: t.pdp.color,
          chooseColor: t.catalog.swatches.selectColor,
          soldOut: t.catalog.badges.soldOut,
          currentPrice: t.pdp.chooseOptions,
          previousPrice: t.pdp.chooseOptions,
          lastUnits: t.catalog.badges.lastUnits,
        }}
      />
    </section>
  );
}
