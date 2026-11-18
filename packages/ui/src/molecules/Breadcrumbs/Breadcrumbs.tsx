// Breadcrumbs (R14): nav > ol de links; el último es aria-current="page".
import { Link } from "../../atoms/Link/Link";
import styles from "./Breadcrumbs.module.scss";

export type Crumb = {
  readonly label: string;
  readonly href?: string;
};

type BreadcrumbsProps = {
  items: readonly Crumb[];
  label: string;
};

export function Breadcrumbs({ items, label }: BreadcrumbsProps) {
  return (
    <nav className={styles.crumbs} aria-label={label}>
      <ol>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`}>
              {last || !item.href ? (
                <span aria-current={last ? "page" : undefined}>{item.label}</span>
              ) : (
                <Link href={item.href} variant="quiet">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
