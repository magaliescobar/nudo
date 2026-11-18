// Opción de faceta (R11): checkbox + label + conteo. Como es multi-faceta con
// "los demás filtros", cada opción es un LINK que togglea el parámetro: funciona
// idéntico con y sin JS (la URL es el estado). Las opciones en 0 se deshabilitan.
import NextLink from "next/link";
import type { ReactNode } from "react";
import styles from "./FacetOption.module.scss";

type FacetOptionProps = {
  href: string;
  label: ReactNode;
  count?: number;
  checked?: boolean;
  disabled?: boolean;
  /** lead visual (p. ej. mini swatch de color). */
  lead?: ReactNode;
  /** aria-label completo cuando el label es visual. */
  ariaLabel?: string;
};

export function FacetOption({
  href,
  label,
  count,
  checked = false,
  disabled = false,
  lead,
  ariaLabel,
}: FacetOptionProps) {
  const inner = (
    <>
      <span className={styles.check} aria-hidden="true">
        {checked && (
          <svg viewBox="0 0 24 24" width="14" height="14" focusable="false">
            <path
              d="m5 12.5 4.5 4.5L19 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {lead}
      <span className={styles.label}>{label}</span>
      {count != null && <span className={styles.count}>{count}</span>}
    </>
  );

  if (disabled) {
    return (
      <span className={[styles.option, styles["is-disabled"]].join(" ")} aria-disabled="true">
        {inner}
      </span>
    );
  }

  return (
    <NextLink
      href={href}
      className={[styles.option, checked && styles["is-checked"]].filter(Boolean).join(" ")}
      aria-current={checked ? "true" : undefined}
      aria-label={ariaLabel}
      scroll={false}
    >
      {inner}
    </NextLink>
  );
}
