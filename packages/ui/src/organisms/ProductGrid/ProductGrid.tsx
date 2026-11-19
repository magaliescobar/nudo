// ProductGrid (R11/R21): grilla responsive de tarjetas. Server Component.
// La clave estable (product.id + variante inicial) evita re-mounts al cambiar filtros.
import type { CardProduct } from "@nudo/commerce/card";
import type { Locale } from "@nudo/i18n/config";
import { ProductCard } from "../ProductCard/ProductCard";
import styles from "./ProductGrid.module.scss";

type ProductGridProps = {
  products: readonly { product: CardProduct; initialVariantId: string }[];
  locale: Locale;
  hrefForVariant: (product: CardProduct, variantId: string) => string;
  labels: {
    color: string;
    chooseColor: string;
    soldOut: string;
    currentPrice: string;
    previousPrice: string;
    new?: string;
    sale?: string;
    lastUnits?: string;
  };
  /** Cuántas primeras tarjetas priorizan imagen (LCP). */
  priorityCount?: number;
  /** aria-label de la lista. */
  label?: string;
  /** Prefijo del view-transition-name de las tarjetas (R23). Default "product-image" matchea la imagen de la PDP; secciones auxiliares pasan uno propio para no duplicar nombres. */
  vtNamePrefix?: string;
};

export function ProductGrid({
  products,
  locale,
  hrefForVariant,
  labels,
  priorityCount = 0,
  label,
  vtNamePrefix = "product-image",
}: ProductGridProps) {
  return (
    <ul className={styles.grid} aria-label={label}>
      {products.map(({ product, initialVariantId }, index) => (
        <li key={`${product.id}:${initialVariantId}`}>
          <ProductCard
            product={product}
            locale={locale}
            initialVariantId={initialVariantId}
            hrefForVariant={(variantId) => hrefForVariant(product, variantId)}
            labels={labels}
            imagePriority={index < priorityCount}
            vtName={`${vtNamePrefix}-${product.id}`}
          />
        </li>
      ))}
    </ul>
  );
}
