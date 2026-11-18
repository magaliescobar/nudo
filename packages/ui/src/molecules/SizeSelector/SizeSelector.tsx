"use client";

// Selector de talle (R14): fieldset con radios nativos — funciona sin JS.
// Cada opción muestra el talle y se deshabilita si no hay stock (available <= 0).
import { useId } from "react";
import { Radio } from "../../atoms/Radio/Radio";
import styles from "./SizeSelector.module.scss";

export type SizeOption = {
  readonly value: string;
  readonly available: number;
};

type SizeSelectorProps = {
  legend: string;
  options: readonly SizeOption[];
  selected?: string;
  /** name del grupo de radios (para FormData en add-to-cart sin JS). */
  name?: string;
  disabled?: boolean;
  labels?: { soldOut?: string };
  onSelect?: (value: string) => void;
};

export function SizeSelector({
  legend,
  options,
  selected,
  name,
  disabled = false,
  labels,
  onSelect,
}: SizeSelectorProps) {
  const autoName = useId();
  const groupName = name ?? autoName;

  return (
    <fieldset className={styles.group} disabled={disabled}>
      <legend>
        <b>{legend}</b>
      </legend>
      <div className={styles.opts}>
        {options.map((option) => {
          const out = option.available <= 0;
          const input = (
            <Radio
              name={groupName}
              value={option.value}
              disabled={out}
              defaultChecked={selected === option.value}
              onChange={onSelect ? () => onSelect(option.value) : undefined}
              aria-label={`${legend} ${option.value}${out && labels?.soldOut ? `, ${labels.soldOut}` : ""}`}
            />
          );
          return (
            <label
              key={option.value}
              className={[
                styles.option,
                out && styles["is-out"],
                selected === option.value && styles["is-selected"],
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {input}
              <span aria-hidden="true">{option.value}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
