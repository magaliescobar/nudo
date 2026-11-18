// OrderSummary (R16): resumen del pedido en checkout y confirmación.
// Server Component: líneas + subtotal + envío + total, todo formateado server-side.
import Image from "next/image";
import type { CartView } from "@nudo/commerce/cart";
import type { Locale } from "@nudo/i18n/config";
import { formatPrice } from "@nudo/i18n/format";
import type { Money } from "@nudo/commerce/money";
import styles from "./OrderSummary.module.scss";

type OrderSummaryProps = {
  locale: Locale;
  cart: CartView;
  /** Costo de envío elegido (checkout) o real (confirmación). */
  shipping?: Money;
  shippingLabel?: string;
  labels: {
    title: string;
    subtotal: string;
    shipping: string;
    total: string;
    each: string;
    empty: string;
  };
  /** Render compacto (mini-cart/checkout lateral). */
  compact?: boolean;
};

export function OrderSummary({
  locale,
  cart,
  shipping,
  shippingLabel,
  labels,
  compact = false,
}: OrderSummaryProps) {
  const total = cart.subtotal.amountInCents + (shipping?.amountInCents ?? 0);

  return (
    <aside className={[styles.summary, compact && styles.compact].filter(Boolean).join(" ")}>
      <h2 className={styles.title}>{labels.title}</h2>
      {cart.lines.length === 0 ? (
        <p className={styles.empty}>{labels.empty}</p>
      ) : (
        <>
          <ul className={styles.lines}>
            {cart.lines.map((line) => (
              <li key={line.sku} className={styles.line}>
                {!compact && line.info.image && (
                  <Image
                    src={line.info.image.src}
                    alt=""
                    width={line.info.image.width}
                    height={line.info.image.height}
                    sizes="48px"
                  />
                )}
                <div className={styles.lineBody}>
                  <p className={styles.name}>{line.info.productName[locale]}</p>
                  {!compact && (
                    <p className={styles.variant}>
                      {line.info.colorName[locale]} · {line.info.size} · ×{line.qty}
                    </p>
                  )}
                  {compact && <p className={styles.variant}>×{line.qty}</p>}
                </div>
                <span className={styles.price}>
                  {formatPrice(locale, line.lineTotal.amountInCents)}
                </span>
              </li>
            ))}
          </ul>
          <dl className={styles.totals}>
            <div>
              <dt>{labels.subtotal}</dt>
              <dd>{formatPrice(locale, cart.subtotal.amountInCents)}</dd>
            </div>
            {shipping && (
              <div>
                <dt>{shippingLabel ?? labels.shipping}</dt>
                <dd>{formatPrice(locale, shipping.amountInCents)}</dd>
              </div>
            )}
            <div className={styles.grand}>
              <dt>{labels.total}</dt>
              <dd>{formatPrice(locale, total)}</dd>
            </div>
          </dl>
        </>
      )}
    </aside>
  );
}
