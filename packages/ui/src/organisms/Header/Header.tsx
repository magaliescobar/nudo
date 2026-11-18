// Header (R10/R15): marca, nav, búsqueda, idioma y carrito.
// El contador del carrito es un AGUJERO DINÁMICO dentro del shell estático:
// `CartBadge` lee cookie+Redis por request dentro de su propio <Suspense>.
import { Suspense } from "react";
import { Link } from "../../atoms/Link/Link";
import { Icon } from "../../atoms/Icon/Icon";
import styles from "./Header.module.scss";
import type { ReactNode } from "react";

type HeaderProps = {
  siteName: string;
  nav: { shop: string; cart: string; help: string; skipToContent: string; search: string };
  localeLabel: string;
  cartHref: string;
  shopHref: string;
  searchHref: string;
  helpHref: string;
  /** Contenido extra a la derecha (LocaleSwitcher). */
  end?: ReactNode;
  /** Agujero dinámico: normalmente <CartBadge/>. */
  cartBadge?: ReactNode;
};

export function Header({
  siteName,
  nav,
  localeLabel,
  cartHref,
  shopHref,
  searchHref,
  helpHref,
  end,
  cartBadge,
}: HeaderProps) {
  return (
    <header className={styles.header}>
      <a className="vh" href="#contenido">
        {nav.skipToContent}
      </a>
      <div className={styles.inner}>
        <Link href={shopHref} className={styles.brand} variant="quiet">
          {siteName}
        </Link>
        <nav className={styles.nav} aria-label={siteName}>
          <Link href={shopHref} variant="quiet">
            {nav.shop}
          </Link>
          <Link href={helpHref} variant="quiet">
            {nav.help}
          </Link>
        </nav>
        <div className={styles.actions}>
          <Link href={searchHref} className={styles.iconBtn} aria-label={nav.search}>
            <Icon name="search" />
          </Link>
          <Suspense fallback={<span className={styles.iconBtn} aria-hidden="true" />}>
            {cartBadge ?? (
              <Link href={cartHref} className={styles.iconBtn} aria-label={nav.cart}>
                <Icon name="cart" />
              </Link>
            )}
          </Suspense>
          {end}
        </div>
      </div>
      <span className="vh">{localeLabel}</span>
    </header>
  );
}
