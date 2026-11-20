// ProductCard (R13): Server Component salvo la isla VariantPicker (cliente).
// La imagen+precio+swatches con preview viven en la isla; el resto es estático.
import NextLink from "next/link";
import type { CardProduct } from "@nudo/commerce/card";
import type { Locale } from "@nudo/i18n/config";
import { Badge } from "../../atoms/Badge/Badge";
import { VariantPicker } from "./VariantPicker";
import styles from "./ProductCard.module.scss";

type ProductCardProps = {
  product: CardProduct;
  locale: Locale;
  /** Variante inicial (color filtrado o default). */
  initialVariantId: string;
  hrefForVariant: (variantId: string) => string;
  labels: {
    color: string;
    chooseColor: string;
    soldOut: string;
    currentPrice: string;
    previousPrice: string;
    sku: string;
    new?: string;
    sale?: string;
    lastUnits?: string;
  };
  imagePriority?: boolean;
  /** Nombre del elemento compartido para el morph PLP→PDP (R23). Default `product-image-{id}`; único por página. */
  vtName?: string;
};

export function ProductCard({
  product,
  locale,
  initialVariantId,
  hrefForVariant,
  labels,
  imagePriority = false,
  vtName,
}: ProductCardProps) {
  const name = product.name[locale];
  const pdpHref = hrefForVariant(product.defaultVariantId);
  const variantHrefs = Object.fromEntries(
    product.variants.map((variant) => [variant.id, hrefForVariant(variant.id)]),
  );

  return (
    <article className={styles.card} data-product-card>
      <div className={styles.mediaWrap}>
        <VariantPicker
          product={product}
          locale={locale}
          initialVariantId={initialVariantId}
          variantHrefs={variantHrefs}
          labels={labels}
          imagePriority={imagePriority}
          vtName={vtName ?? `product-image-${product.id}`}
        />
        <div className={styles.badges}>
          {!product.hasStock ? (
            <Badge kind="out">{labels.soldOut}</Badge>
          ) : product.onSale && labels.sale ? (
            <Badge kind="sale">{labels.sale}</Badge>
          ) : null}
        </div>
      </div>
      <div className={styles.body}>
        <p className={styles.brand}>{product.brand}</p>
        <NextLink href={pdpHref} className={styles.name}>
          {name}
        </NextLink>
      </div>
    </article>
  );
}
