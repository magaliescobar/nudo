"use client";

// Isla cliente mínima de la tarjeta (R13): imagen + precio + swatches.
// Sin JS sigue renderizando links a la PDP de cada variante; con JS el hover/focus
// hace preview de imagen/precio sin navegar y el click va a la variante.
import Image from "next/image";
import { useState } from "react";
import type { CardProduct } from "@nudo/commerce/card";
import type { Locale } from "@nudo/i18n/config";
import { formatPrice } from "@nudo/i18n/format";
import { SwatchGroup, type SwatchOption } from "../../molecules/SwatchGroup/SwatchGroup";
import { blurDataURLFromHex } from "../../utils/placeholder";
import styles from "./VariantPicker.module.scss";

type VariantPickerProps = {
  product: CardProduct;
  locale: Locale;
  /** Variante inicial: la del filtro de color activo o la default. */
  initialVariantId: string;
  /** href de la PDP por variante (lo arma el Server Component padre — las funciones no cruzan la frontera cliente). */
  variantHrefs: Record<string, string>;
  labels: {
    color: string;
    chooseColor: string;
    soldOut: string;
    currentPrice: string;
    previousPrice: string;
  };
  imagePriority?: boolean;
};

export function VariantPicker({
  product,
  locale,
  initialVariantId,
  variantHrefs,
  labels,
  imagePriority = false,
}: VariantPickerProps) {
  const variants = product.variants;
  const initial = variants.find((v) => v.id === initialVariantId) ?? variants[0];
  const [previewId, setPreviewId] = useState<string | null>(null);
  const activeId = previewId ?? initial?.id ?? "";
  const active = variants.find((v) => v.id === activeId) ?? initial;
  const image = active?.image;
  const name = product.name[locale];

  const options: SwatchOption[] = variants.map((variant) => ({
    id: variant.id,
    name: variant.colorName[locale],
    hex: variant.colorHex,
    hasStock: variant.hasStock,
    href: variantHrefs[variant.id] ?? "#",
  }));

  return (
    <>
      <div className={styles.media} data-media>
        {image ? (
          <Image
            src={image.src}
            alt={image.alt[locale] || `${name}, ${active?.colorName[locale] ?? ""}`}
            width={image.width}
            height={image.height}
            sizes="(min-width: 60rem) 25vw, 50vw"
            priority={imagePriority}
            placeholder="blur"
            blurDataURL={blurDataURLFromHex(active?.colorHex ?? "#E9E4D8")}
          />
        ) : (
          <span className={styles.noImage} aria-hidden="true" />
        )}
      </div>
      <SwatchGroup
        legend={labels.color}
        selectedName={active?.colorName[locale]}
        options={options}
        selectedId={active?.id}
        size="sm"
        showLabel={false}
        compact
        onPreview={setPreviewId}
        labels={{ soldOut: labels.soldOut, chooseColor: labels.chooseColor }}
      />
      <p className={styles.price} data-price>
        {active?.minPrice ? (
          <>
            <span className="vh">
              {labels.currentPrice}: {formatPrice(locale, active.minPrice.amountInCents)}
            </span>
            <span aria-hidden="true">{formatPrice(locale, active.minPrice.amountInCents)}</span>
          </>
        ) : null}
      </p>
    </>
  );
}
