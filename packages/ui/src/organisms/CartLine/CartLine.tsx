// CartLine (R15): línea del carrito con precio/stock vigentes del servidor.
// La edición de cantidad/remoción va por forms POST a server actions (funciona
// sin JS). Avisos de cambio de precio o stock se muestran inline.
import Image from "next/image";
import Link from "next/link";
import type { PricedCartLine } from "@nudo/commerce/cart";
import type { Locale } from "@nudo/i18n/config";
import { formatPrice } from "@nudo/i18n/format";
import { Badge } from "../../atoms/Badge/Badge";
import { Button } from "../../atoms/Button/Button";
import { QuantityStepper } from "../../molecules/QuantityStepper/QuantityStepper";
import styles from "./CartLine.module.scss";

type CartLineProps = {
  line: PricedCartLine;
  locale: Locale;
  labels: {
    quantity: string;
    decrease: string;
    increase: string;
    remove: string;
    priceChanged: string;
    outOfStock: string;
    onlyLeft: string;
    each: string;
  };
  /** Server actions (POST) — las inyecta la página; funcionan sin JS. */
  updateAction?: (formData: FormData) => void | Promise<void>;
  removeAction?: (formData: FormData) => void | Promise<void>;
};

export function CartLine({ line, locale, labels, updateAction, removeAction }: CartLineProps) {
  const { info, qty, available, exceedsStock, priceChanged, unitPrice, lineTotal } = line;
  const name = info.productName[locale];
  const href = `/${locale}/p/${info.productSlug[locale]}?v=${info.variantId}`;

  return (
    <li className={styles.line}>
      <Link href={href} className={styles.media} aria-label={name}>
        {info.image ? (
          <Image
            src={info.image.src}
            alt={info.image.alt[locale] || name}
            width={info.image.width}
            height={info.image.height}
            sizes="96px"
          />
        ) : (
          <span className={styles.noImage} aria-hidden="true" />
        )}
      </Link>
      <div className={styles.details}>
        <div className={styles.head}>
          <div>
            <p className={styles.brand}>{info.brand}</p>
            <Link href={href} className={styles.name}>
              {name}
            </Link>
            <p className={styles.variant}>
              {info.colorName[locale]} · {info.size}
            </p>
          </div>
          <p className={styles.total}>{formatPrice(locale, lineTotal.amountInCents)}</p>
        </div>
        <div className={styles.meta}>
          <p className={styles.unit}>
            {formatPrice(locale, unitPrice.amountInCents)} {labels.each}
            {priceChanged && <Badge kind="low">{labels.priceChanged}</Badge>}
          </p>
          {exceedsStock && (
            <p className={styles.stockWarn} role="status">
              <Badge kind="out">{labels.outOfStock}</Badge>{" "}
              {labels.onlyLeft.replace("{count}", String(available))}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          {updateAction ? (
            <form action={updateAction} className={styles.qtyForm}>
              <input type="hidden" name="sku" value={line.sku} />
              <QuantityStepper
                value={qty}
                min={0}
                max={99}
                name="qty"
                labels={{
                  quantity: labels.quantity,
                  decrease: labels.decrease,
                  increase: labels.increase,
                }}
              />
              <Button type="submit" size="sm" variant="secondary">
                {labels.quantity}
              </Button>
            </form>
          ) : (
            <span className={styles.qtyStatic}>×{qty}</span>
          )}
          {removeAction && (
            <form action={removeAction}>
              <input type="hidden" name="sku" value={line.sku} />
              <Button type="submit" size="sm" variant="ghost">
                {labels.remove}
              </Button>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}
