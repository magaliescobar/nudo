// Novedades de la home (R10): PLP sort=newest, 100 % `use cache` ⇒ prerenderiza
// en el shell estático y ya está en el HTML inicial, también sin JavaScript.
import type { Locale } from "@nudo/i18n/config";
import type { Dictionary } from "@nudo/i18n/dictionaries";
import { ProductGrid } from "@nudo/ui/organisms/ProductGrid";
import { toCardProduct } from "@nudo/commerce/card";
import { getPlpPage, getPlpStock } from "../../../lib/plp";
import { hrefForVariant } from "./PlpView";

export async function NewArrivals({ locale, t }: { locale: Locale; t: Dictionary }) {
  const result = await getPlpPage({}, locale, "newest", 1);
  const stock = await getPlpStock(result.products);
  const cards = result.products.slice(0, 8).map((product) => ({
    product: toCardProduct(product, stock),
    initialVariantId: product.defaultVariantId,
  }));
  if (cards.length === 0) return null;
  return (
    <section aria-labelledby="new-title" className="home-section">
      <h2 id="new-title">{t.home.newArrivals}</h2>
      <ProductGrid
        vtNamePrefix="arrivals"
        products={cards}
        locale={locale}
        hrefForVariant={hrefForVariant(locale)}
        labels={{
          color: t.pdp.color,
          chooseColor: t.catalog.swatches.selectColor,
          soldOut: t.catalog.badges.soldOut,
          currentPrice: t.pdp.chooseOptions,
          previousPrice: t.pdp.chooseOptions,
          new: t.catalog.badges.new,
          sale: t.catalog.badges.sale,
        }}
        priorityCount={1}
      />
    </section>
  );
}
