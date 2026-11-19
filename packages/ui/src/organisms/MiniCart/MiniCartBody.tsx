// Cuerpo del MiniCart: líneas, subtotal y acciones. Chunk separado (R34):
// se carga bajo demanda al abrir el drawer — el contenido no crítico
// (next/image, formatPrice, ButtonLink) no viaja en el JS inicial.
"use client";

import Image from "next/image";
import Link from "next/link";
import type { CartView } from "@nudo/commerce/cart";
import type { Locale } from "@nudo/i18n/config";
import { formatPrice } from "@nudo/i18n/format";
import { ButtonLink } from "../../atoms/Button/Button";
import { blurDataURLFromHex } from "../../utils/placeholder";
import styles from "./MiniCart.module.scss";

type MiniCartBodyProps = {
  locale: Locale;
  cart: CartView;
  labels: {
    empty: string;
    subtotal: string;
    checkout: string;
    viewCart: string;
    continueShopping: string;
  };
  cartHref: string;
  checkoutHref: string;
  shopHref: string;
  onClose: () => void;
};

export default function MiniCartBody({
  locale,
  cart,
  labels,
  cartHref,
  checkoutHref,
  shopHref,
  onClose,
}: MiniCartBodyProps) {
  if (cart.lines.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{labels.empty}</p>
        <Link href={shopHref} onClick={onClose}>
          {labels.continueShopping}
        </Link>
      </div>
    );
  }
  return (
    <>
      <ul className={styles.lines}>
        {cart.lines.map((line) => (
          <li key={line.sku} className={styles.line}>
            <Image
              src={line.info.image?.src ?? ""}
              alt=""
              width={line.info.image?.width ?? 64}
              height={line.info.image?.height ?? 64}
              sizes="48px"
              placeholder="blur"
              blurDataURL={blurDataURLFromHex(line.info.colorHex)}
            />
            <div>
              <p className={styles.name}>{line.info.productName[locale]}</p>
              <p className={styles.variant}>
                {line.info.colorName[locale]} · {line.info.size} · ×{line.qty}
              </p>
            </div>
            <span className={styles.price}>
              {formatPrice(locale, line.lineTotal.amountInCents)}
            </span>
          </li>
        ))}
      </ul>
      <div className={styles.foot}>
        <p className={styles.subtotal}>
          {labels.subtotal}: {formatPrice(locale, cart.subtotal.amountInCents)}
        </p>
        <ButtonLink href={checkoutHref} onClick={onClose} block>
          {labels.checkout}
        </ButtonLink>
        <Link href={cartHref} onClick={onClose} className={styles.viewCart}>
          {labels.viewCart}
        </Link>
      </div>
    </>
  );
}
