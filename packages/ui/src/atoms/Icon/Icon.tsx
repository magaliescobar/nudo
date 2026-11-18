// Server Component: iconos SVG de trazo (stroke currentColor), como el catálogo.
// Set mínimo de la tienda; cada icono es un path inline sin deps.
import type { ReactNode } from "react";
import styles from "./Icon.module.scss";

export type IconName =
  | "search"
  | "cart"
  | "menu"
  | "close"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "plus"
  | "minus"
  | "trash"
  | "globe"
  | "alert"
  | "arrowRight"
  | "check"
  | "package";

const paths: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  cart: (
    <>
      <path d="M6 7h12l1.5 12.5a1 1 0 0 1-1 1.1H5.5a1 1 0 0 1-1-1.1L6 7Z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6.5 7 7.5 20a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 2.8 19.5h18.4L12 4Z" />
      <path d="M12 10v4M12 17.2v.3" />
    </>
  ),
  arrowRight: <path d="M4 12h16m-6-6 6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  package: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M4.5 7.8 12 12l7.5-4.2M12 12v9" />
    </>
  ),
};

type IconProps = {
  name: IconName;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Decorativo por defecto; pasar label para iconos con significado. */
  label?: string;
};

export function Icon({ name, size = "md", className, label }: IconProps) {
  return (
    <svg
      className={[styles.icon, size !== "md" && styles[`is-${size}`], className]
        .filter(Boolean)
        .join(" ")}
      viewBox="0 0 24 24"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
