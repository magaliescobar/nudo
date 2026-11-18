// Paginación (R11/R12): links reales a ?page=n — funciona sin JS y es rastreable.
// Patrón del catálogo: prev/next en los bordes + números con ellipsis.
import { Link } from "../../atoms/Link/Link";
import { Icon } from "../../atoms/Icon/Icon";
import styles from "./Pagination.module.scss";

type PaginationProps = {
  /** URL base con los filtros actuales (sin ?page). */
  hrefFor: (page: number) => string;
  page: number;
  pageCount: number;
  labels: { previous: string; next: string; page: string };
};

function pageList(page: number, pageCount: number): (number | "gap")[] {
  const candidates = [1, page - 1, page, page + 1, pageCount].filter(
    (n, i, a) => n >= 1 && n <= pageCount && a.indexOf(n) === i,
  );
  const sorted = [...new Set(candidates)].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push("gap");
    out.push(n);
    prev = n;
  }
  return out;
}

export function Pagination({ hrefFor, page, pageCount, labels }: PaginationProps) {
  if (pageCount <= 1) return null;
  const items = pageList(page, pageCount);

  return (
    <nav className={styles.pager} aria-label={labels.page}>
      <ul>
        <li>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className={styles.edge} rel="prev" scroll={false}>
              <Icon name="chevronLeft" size="sm" />
              <span>{labels.previous}</span>
            </Link>
          ) : (
            <span className={[styles.edge, styles["is-disabled"]].join(" ")} aria-disabled="true">
              <Icon name="chevronLeft" size="sm" />
              <span>{labels.previous}</span>
            </span>
          )}
        </li>
        {items.map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`}>
              <span className={styles.gap} aria-hidden="true">
                …
              </span>
            </li>
          ) : (
            <li key={item}>
              {item === page ? (
                <span
                  className={styles.current}
                  aria-current="page"
                  aria-label={`${labels.page} ${item}`}
                >
                  {item}
                </span>
              ) : (
                <Link href={hrefFor(item)} scroll={false} aria-label={`${labels.page} ${item}`}>
                  {item}
                </Link>
              )}
            </li>
          ),
        )}
        <li>
          {page < pageCount ? (
            <Link href={hrefFor(page + 1)} className={styles.edge} rel="next" scroll={false}>
              <span>{labels.next}</span>
              <Icon name="chevronRight" size="sm" />
            </Link>
          ) : (
            <span className={[styles.edge, styles["is-disabled"]].join(" ")} aria-disabled="true">
              <span>{labels.next}</span>
              <Icon name="chevronRight" size="sm" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
