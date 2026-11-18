// Selector de variante del PDP (R14): color (SwatchGroup) + talle (SizeSelector)
// + CTA agregar. Funciona sin JS: cada color es link ?v= y el submit del form
// lleva size/variant por FormData. Con JS, la isla PDPVariantClient actualiza
// precio/stock sin reload.
import type { Money } from "@nudo/commerce/money";
import type { Locale } from "@nudo/i18n/config";
import { Button } from "../../atoms/Button/Button";
import { Badge } from "../../atoms/Badge/Badge";
import { Price } from "../../atoms/Price/Price";
import { SwatchGroup, type SwatchOption } from "../../molecules/SwatchGroup/SwatchGroup";
import { SizeSelector } from "../../molecules/SizeSelector/SizeSelector";
import styles from "./VariantSelector.module.scss";
import type { ReactNode } from "react";

export type VariantOption = {
  readonly id: string;
  readonly colorName: string;
  readonly colorHex: string;
  readonly hasStock: boolean;
  readonly href: string;
};

export type SizeOptionData = {
  readonly value: string;
  readonly available: number;
};

type VariantSelectorProps = {
  colorLegend: string;
  sizeLegend: string;
  variants: readonly VariantOption[];
  selectedColorId: string;
  sizes: readonly SizeOptionData[];
  selectedSize?: string;
  /** Precio vigente de la variante/sku elegido (lo resuelve el servidor). */
  price: Money;
  compareAt?: Money;
  locale: Locale;
  stockLabel: string;
  soldOutLabel: string;
  lowStockLabel?: string;
  lowStockThreshold?: number;
  available: number;
  addLabel: string;
  qtyName?: string;
  labels: { soldOut: string; chooseColor: string };
  /** Hidden inputs extra para el form (p. ej. productId, variantId). */
  hiddenInputs?: readonly { name: string; value: string }[];
  /** Server action del formulario (POST). */
  action?: (formData: FormData) => void | Promise<void>;
  children?: ReactNode;
};

export function VariantSelector({
  colorLegend,
  sizeLegend,
  variants,
  selectedColorId,
  sizes,
  selectedSize,
  price,
  compareAt,
  locale,
  stockLabel,
  soldOutLabel,
  lowStockLabel,
  lowStockThreshold = 5,
  available,
  addLabel,
  qtyName,
  labels,
  hiddenInputs = [],
  action,
  children,
}: VariantSelectorProps) {
  const out = available <= 0;
  const low = !out && available <= lowStockThreshold;

  const options: SwatchOption[] = variants.map((variant) => ({
    id: variant.id,
    name: variant.colorName,
    hex: variant.colorHex,
    hasStock: variant.hasStock,
    href: variant.href,
  }));

  // Todo el selector vive dentro del <form>: los radios de talle (`name="size"`)
  // solo llegan al FormData si son descendientes del form (R14, add-to-cart sin JS).
  return (
    <form action={action} className={styles.form}>
      <div className={styles.selector}>
        <SwatchGroup
          legend={colorLegend}
          options={options}
          selectedId={selectedColorId}
          selectedName={variants.find((v) => v.id === selectedColorId)?.colorName}
          labels={labels}
        />
        {sizes.length > 0 && (
          <SizeSelector
            legend={sizeLegend}
            options={sizes}
            selected={selectedSize}
            name="size"
            labels={{ soldOut: labels.soldOut }}
          />
        )}
        <div className={styles.buyRow}>
          <Price price={price} compareAt={compareAt} locale={locale} />
          {out ? (
            <Badge kind="out">{soldOutLabel}</Badge>
          ) : low && lowStockLabel ? (
            <Badge kind="low">{`${lowStockLabel} (${available})`}</Badge>
          ) : (
            <Badge kind="count">{stockLabel}</Badge>
          )}
        </div>
        {hiddenInputs.map((field) => (
          <input key={field.name} type="hidden" name={field.name} value={field.value} />
        ))}
        {qtyName && <input type="hidden" name={qtyName} value="1" />}
        <Button type="submit" variant="primary" block disabled={out}>
          {addLabel}
        </Button>
        {children}
      </div>
    </form>
  );
}
