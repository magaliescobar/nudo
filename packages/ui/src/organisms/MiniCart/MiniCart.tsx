// MiniCart (R15): drawer del carrito. Client Component — abre/cierra, Escape,
// focus trap liviano y optimistic qty. El contenido llega ya resuelto del server.
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CartView } from "@nudo/commerce/cart";
import type { Locale } from "@nudo/i18n/config";
import { formatPrice } from "@nudo/i18n/format";
import { ButtonLink } from "../../atoms/Button/Button";
import { Icon } from "../../atoms/Icon/Icon";
import styles from "./MiniCart.module.scss";

type MiniCartProps = {
  locale: Locale;
  cart: CartView;
  labels: {
    title: string;
    empty: string;
    subtotal: string;
    checkout: string;
    viewCart: string;
    close: string;
    quantity: string;
    decrease: string;
    increase: string;
    remove: string;
    continueShopping: string;
  };
  cartHref: string;
  checkoutHref: string;
  shopHref: string;
};

export function MiniCart({
  locale,
  cart,
  labels,
  cartHref,
  checkoutHref,
  shopHref,
}: MiniCartProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Icon name="cart" />
        <span className="vh">{labels.title}</span>
        {cart.itemCount > 0 && <span className={styles.count}>{cart.itemCount}</span>}
      </button>
      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div
            ref={panelRef}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label={labels.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.head}>
              <h2>{labels.title}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={labels.close}>
                <Icon name="close" />
              </button>
            </div>
            {cart.lines.length === 0 ? (
              <div className={styles.empty}>
                <p>{labels.empty}</p>
                <Link href={shopHref} onClick={() => setOpen(false)}>
                  {labels.continueShopping}
                </Link>
              </div>
            ) : (
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
                  <ButtonLink href={checkoutHref} block>
                    {labels.checkout}
                  </ButtonLink>
                  <Link href={cartHref} onClick={() => setOpen(false)} className={styles.viewCart}>
                    {labels.viewCart}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
