// Swatch de color (R13): círculo con el hex de la variante vía `--c`.
// Modos: `static` (span, role=img) para mostrar, o botón/enlace para elegir.
// Estados: selected, out (sin stock), sm (compacto en tarjetas), hover (preview).
import type { CSSProperties, ReactNode } from "react";
import styles from "./Swatch.module.scss";

type SwatchProps = {
  /** Color de la variante (hex). */
  hex: string;
  /** Nombre accesible del color (ya localizado). */
  name: string;
  selected?: boolean;
  out?: boolean;
  size?: "md" | "sm";
  /** Texto extra para lectores de pantalla (p. ej. "agotado"). */
  outLabel?: string;
  className?: string;
  children?: ReactNode;
};

export function Swatch({
  hex,
  name,
  selected = false,
  out = false,
  size = "md",
  outLabel,
  className,
  children,
}: SwatchProps) {
  return (
    <span
      className={[
        styles.swatch,
        selected && styles["is-selected"],
        out && styles["is-out"],
        size === "sm" && styles["is-sm"],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--c": hex } as CSSProperties}
      role="img"
      aria-label={`${name}${out && outLabel ? `, ${outLabel}` : ""}`}
      aria-hidden={children ? true : undefined}
    >
      {children}
    </span>
  );
}
