// DTO serializable de tarjeta de producto (R13): lo que la UI necesita sin arrastrar
// el documento completo. Construido en el servidor a partir de Product + stock.
import type { Localized } from "@nudo/i18n/config";
import type { Product, ProductStatus } from "./catalog";
import type { Money } from "./money";

export type CardImage = {
  readonly src: string;
  readonly alt: Localized<string>;
  readonly width: number;
  readonly height: number;
};

export type CardVariant = {
  readonly id: string;
  readonly sku: string;
  readonly colorName: Localized<string>;
  readonly colorHex: string;
  readonly image?: CardImage;
  /** Algún SKU de la variante tiene disponible > 0. */
  readonly hasStock: boolean;
  /** Precio más bajo de la variante (para mostrar "desde"). */
  readonly minPrice: Money;
};

export type CardProduct = {
  readonly id: string;
  readonly slug: Localized<string>;
  readonly name: Localized<string>;
  readonly brand: string;
  readonly status: ProductStatus;
  readonly defaultVariantId: string;
  readonly categoryIds: readonly string[];
  readonly variants: readonly CardVariant[];
  /** Algún SKU de cualquier variante tiene stock. */
  readonly hasStock: boolean;
  /** Algún SKU tiene compareAtPrice > price (insignia de oferta). */
  readonly onSale: boolean;
};

export function toCardProduct(
  product: Product,
  stock: Readonly<Record<string, number>>,
): CardProduct {
  const variants = product.variants.map((variant) => {
    const prices = variant.skus.map((sku) => sku.price.amountInCents);
    return {
      id: variant.id,
      sku: variant.skus[0]?.sku ?? "",
      colorName: variant.color.name,
      colorHex: variant.color.hex,
      image: variant.images[0]
        ? {
            src: variant.images[0].src,
            alt: variant.images[0].alt,
            width: variant.images[0].width,
            height: variant.images[0].height,
          }
        : undefined,
      hasStock: variant.skus.some((sku) => (stock[sku.sku] ?? 0) > 0),
      minPrice: { amountInCents: Math.min(...prices), currency: "USD" as const },
    };
  });
  const allSkus = product.variants.flatMap((variant) => variant.skus);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    status: product.status,
    defaultVariantId: product.defaultVariantId,
    categoryIds: product.categoryIds,
    variants,
    hasStock: variants.some((variant) => variant.hasStock),
    onSale: allSkus.some(
      (sku) => sku.compareAtPrice && sku.compareAtPrice.amountInCents > sku.price.amountInCents,
    ),
  };
}
