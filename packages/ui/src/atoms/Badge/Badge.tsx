// Server Component: insignias de producto/estado. Kinds del catálogo:
// new, sale, low (pocas unidades), out (agotado), discontinued, count (carrito).
import type { ReactNode } from "react";
import styles from "./Badge.module.scss";

export type BadgeKind = "new" | "sale" | "low" | "out" | "discontinued" | "count";

type BadgeProps = {
  kind: BadgeKind;
  children: ReactNode;
  className?: string;
};

export function Badge({ kind, children, className }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[`is-${kind}`], className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}
