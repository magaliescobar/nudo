// MiniCart (R15): drawer del carrito. Client Component — abre/cierra, Escape,
// focus trap liviano y optimistic qty. El contenido llega ya resuelto del server.
// R34: el cuerpo del panel carga lazy (chunk aparte) — no es contenido crítico
// del first load; se precarga en hover/focus del trigger para abrir sin lag.
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CartView } from "@nudo/commerce/cart";
import type { Locale } from "@nudo/i18n/config";
import { Icon } from "../../atoms/Icon/Icon";
import styles from "./MiniCart.module.scss";

const MiniCartBody = dynamic(() => import("./MiniCartBody"));

// Calienta el chunk del panel antes del click (mismo specifier que dynamic()).
const warmPanel = () => void import("./MiniCartBody");

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
        onMouseEnter={warmPanel}
        onFocus={warmPanel}
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
            <MiniCartBody
              locale={locale}
              cart={cart}
              labels={labels}
              cartHref={cartHref}
              checkoutHref={checkoutHref}
              shopHref={shopHref}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
