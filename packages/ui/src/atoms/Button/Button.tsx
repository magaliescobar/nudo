// Server Component salvo `busy`/`href` con navegación: markup puro, estilos por tokens.
// Variantes y estados del catálogo: primary (default), accent, secondary, ghost;
// tamaños md/sm; iconOnly; block; disabled; busy (aria-busy + spinner).
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Button.module.scss";

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost";
type ButtonSize = "md" | "sm";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconOnly?: boolean;
  block?: boolean;
  disabled?: boolean;
  /** Muestra spinner y deshabilita la interacción (aria-busy). */
  busy?: boolean;
  /** Texto accesible cuando iconOnly. */
  label?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  name?: string;
  value?: string;
};

type ButtonLinkProps = Omit<ButtonProps, "type" | "onClick" | "busy"> & {
  href: string;
  prefetch?: boolean;
};

function classes(variant: ButtonVariant, size: ButtonSize, extra: (string | false | undefined)[]) {
  return [
    styles.btn,
    variant !== "primary" && styles[`is-${variant}`],
    size === "sm" && styles["is-sm"],
    ...extra.filter(Boolean),
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconOnly = false,
  block = false,
  disabled = false,
  busy = false,
  label,
  className,
  type = "button",
  onClick,
  name,
  value,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classes(variant, size, [
        iconOnly && styles["is-icon"],
        block && styles["is-block"],
        busy && styles.busy,
        className,
      ])}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      aria-label={iconOnly ? label : undefined}
      onClick={onClick}
      name={name}
      value={value}
    >
      {icon}
      {!iconOnly && <span>{children}</span>}
      {busy && (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          <span className="vh">{label ?? children}</span>
        </>
      )}
    </button>
  );
}

/** Botón que navega: mismas variantes, renderiza next/link (SPA + prefetch). */
export function ButtonLink({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconOnly = false,
  block = false,
  disabled = false,
  label,
  className,
  href,
  prefetch,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-disabled={disabled || undefined}
      className={classes(variant, size, [
        iconOnly && styles["is-icon"],
        block && styles["is-block"],
        disabled && styles.disabled,
        className,
      ])}
    >
      {icon}
      {!iconOnly && <span>{children}</span>}
      {iconOnly && <span className="vh">{label}</span>}
    </Link>
  );
}
