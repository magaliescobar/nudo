"use client";

// Grupo de swatches de color (R13): fieldset + radiogroup accesible.
// Dos modos:
//  - links: cada swatch es un Link a la PDP de esa variante (funciona sin JS).
//  - buttons: radios que notifican `onSelect` (PDP, cambia variante sin recargar).
// Con JS, hover/focus sobre un swatch dispara `onPreview` para anticipar la imagen.
import NextLink from "next/link";
import { Swatch } from "../../atoms/Swatch/Swatch";
import styles from "./SwatchGroup.module.scss";

export type SwatchOption = {
  readonly id: string;
  readonly name: string;
  readonly hex: string;
  readonly hasStock: boolean;
  /** href de la variante (modo links). */
  readonly href?: string;
};

type SwatchGroupProps = {
  legend: string;
  /** Nombre del color seleccionado (se anuncia en el legend). */
  selectedName?: string;
  options: readonly SwatchOption[];
  selectedId?: string;
  size?: "md" | "sm";
  compact?: boolean;
  showLabel?: boolean;
  /** Modo interactivo: notifica la variante elegida (PDP). */
  onSelect?: (id: string) => void;
  /** Preview en hover/focus (tarjeta). */
  onPreview?: (id: string) => void;
  labels?: { soldOut?: string; chooseColor?: string };
};

export function SwatchGroup({
  legend,
  selectedName,
  options,
  selectedId,
  size = "md",
  compact = false,
  showLabel = true,
  onSelect,
  onPreview,
  labels,
}: SwatchGroupProps) {
  const interactive = Boolean(onSelect);
  const preview = (id: string) => onPreview?.(id);

  return (
    <div className={styles.swatchGroup}>
      <fieldset
        className={[styles.group, compact && styles["is-compact"]].filter(Boolean).join(" ")}
      >
        <legend className={showLabel ? undefined : "vh"}>
          <b>{legend}:</b> {selectedName && <span data-color-name>{selectedName}</span>}
        </legend>
        <div className={styles.opts} role="radiogroup" aria-label={labels?.chooseColor ?? legend}>
          {options.map((option) => {
            const selected = option.id === selectedId;
            const outLabel = option.hasStock ? undefined : labels?.soldOut;
            const ariaLabel = `${option.name}${outLabel ? `, ${outLabel}` : ""}`;
            const swatch = (
              <Swatch
                hex={option.hex}
                name={option.name}
                selected={selected}
                out={!option.hasStock}
                size={size}
                outLabel={outLabel}
              />
            );
            const cls = [styles.swatchBtn, size === "sm" && styles["is-sm"]]
              .filter(Boolean)
              .join(" ");
            const previewHandlers = onPreview
              ? { onMouseEnter: () => preview(option.id), onFocus: () => preview(option.id) }
              : {};

            if (interactive) {
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  className={cls}
                  onClick={() => onSelect?.(option.id)}
                  aria-label={ariaLabel}
                  {...previewHandlers}
                >
                  {swatch}
                </button>
              );
            }

            return option.href ? (
              <NextLink
                key={option.id}
                href={option.href}
                className={cls}
                aria-label={ariaLabel}
                role="radio"
                aria-checked={selected}
                {...previewHandlers}
              >
                {swatch}
              </NextLink>
            ) : (
              <span
                key={option.id}
                className={styles.swatchStatic}
                role="radio"
                aria-checked={selected}
              >
                {swatch}
              </span>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
