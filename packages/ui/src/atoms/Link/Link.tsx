// Server Component: enlace interno con next/link (navegación SPA + prefetch).
// Variantes del catálogo: default (subrayado), quiet (sin subrayado), muted.
import NextLink from "next/link";
import type { ReactNode } from "react";
import styles from "./Link.module.scss";

type LinkVariant = "default" | "quiet" | "muted";

type LinkProps = {
  href: string;
  children: ReactNode;
  variant?: LinkVariant;
  className?: string;
  prefetch?: boolean;
  scroll?: boolean;
  "aria-label"?: string;
  "aria-current"?: "page" | "step" | "location" | "date" | "time" | boolean;
  hrefLang?: string;
  rel?: string;
  onClick?: () => void;
};

export function Link({
  href,
  children,
  variant = "default",
  className,
  prefetch,
  scroll,
  onClick,
  ...rest
}: LinkProps) {
  return (
    <NextLink
      href={href}
      prefetch={prefetch}
      scroll={scroll}
      onClick={onClick}
      className={[styles.link, variant !== "default" && styles[`is-${variant}`], className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </NextLink>
  );
}
