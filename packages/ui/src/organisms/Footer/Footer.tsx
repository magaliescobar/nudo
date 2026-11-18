// Footer (R10): marca, links de tienda/ayuda y legal. Server Component.
import { Link } from "../../atoms/Link/Link";
import styles from "./Footer.module.scss";

type FooterProps = {
  siteName: string;
  tagline: string;
  shopLabel: string;
  helpLabel: string;
  legal: string;
  shopHref: string;
  helpHref: string;
};

export function Footer({
  siteName,
  tagline,
  shopLabel,
  helpLabel,
  legal,
  shopHref,
  helpHref,
}: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <p className={styles.brand}>{siteName}</p>
          <p className={styles.tagline}>{tagline}</p>
        </div>
        <nav aria-label={siteName}>
          <ul className={styles.links}>
            <li>
              <Link href={shopHref} variant="quiet">
                {shopLabel}
              </Link>
            </li>
            <li>
              <Link href={helpHref} variant="quiet">
                {helpLabel}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className={styles.legal}>{legal}</p>
    </footer>
  );
}
