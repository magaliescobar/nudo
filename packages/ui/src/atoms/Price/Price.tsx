// Server Component: precio formateado con Intl (R25). `amountInCents` en dominio.
// Estados del catálogo: normal, is-sale (precio tachado + % off), is-lg.
import { formatPrice } from "@nudo/i18n/format";
import type { Locale } from "@nudo/i18n/config";
import type { Money } from "@nudo/commerce/money";
import styles from "./Price.module.scss";

type PriceProps = {
  price: Money | number;
  compareAt?: Money | number;
  locale: Locale;
  size?: "md" | "lg";
  /** Etiquetas accesibles localizadas para lectores de pantalla. */
  labels?: { current: string; previous: string };
  currency?: string;
};

const cents = (value: Money | number) => (typeof value === "number" ? value : value.amountInCents);

export function Price({ price, compareAt, locale, size = "md", labels, currency }: PriceProps) {
  const now = cents(price);
  const was = compareAt != null ? cents(compareAt) : undefined;
  const sale = was != null && was > now;
  const off = sale ? Math.round((1 - now / was) * 100) : 0;

  return (
    <span
      className={[styles.price, sale && styles["is-sale"], size === "lg" && styles["is-lg"]]
        .filter(Boolean)
        .join(" ")}
    >
      {sale && labels?.current && <span className="vh">{labels.current}: </span>}
      <span className={styles.now}>{formatPrice(locale, now, currency)}</span>
      {sale && was != null && (
        <>
          {labels?.previous && <span className="vh">{labels.previous}: </span>}
          <del>{formatPrice(locale, was, currency)}</del>
          <span className={styles.off}>−{off}%</span>
        </>
      )}
    </span>
  );
}
