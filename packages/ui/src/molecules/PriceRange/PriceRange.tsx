// Rango de precio (R11): dos inputs numéricos + botón aplicar dentro de un <form method="get">
// para que funcione sin JS (los demás filtros viajan en hidden inputs que arma el caller).
import type { ReactNode } from "react";
import { Button } from "../../atoms/Button/Button";
import { Input } from "../../atoms/Input/Input";
import styles from "./PriceRange.module.scss";

type PriceRangeProps = {
  minName?: string;
  maxName?: string;
  minValue?: number;
  maxValue?: number;
  labels: { min: string; max: string; apply: string };
  /** hidden inputs con el resto del estado (q, color, size, brand, stock, sort, page). */
  hidden?: readonly { name: string; value: string }[];
  /** Si está presente, el rango se aplica solo (submit) con este texto. */
  submitLabel?: string;
  children?: ReactNode;
};

export function PriceRange({
  minName = "pmin",
  maxName = "pmax",
  minValue,
  maxValue,
  labels,
  hidden = [],
  submitLabel,
  children,
}: PriceRangeProps) {
  return (
    <form method="get" className={styles.range}>
      {hidden.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
      <div className={styles.row}>
        <label className={styles.field}>
          <span>{labels.min}</span>
          <Input
            type="number"
            name={minName}
            min={0}
            step="1"
            inputMode="decimal"
            defaultValue={minValue}
            placeholder="0"
          />
        </label>
        <label className={styles.field}>
          <span>{labels.max}</span>
          <Input
            type="number"
            name={maxName}
            min={0}
            step="1"
            inputMode="decimal"
            defaultValue={maxValue}
            placeholder="999"
          />
        </label>
      </div>
      {children}
      <Button type="submit" size="sm" variant="secondary" block>
        {submitLabel ?? labels.apply}
      </Button>
    </form>
  );
}
