// FacetPanel (R11): panel de facetas del PLP. Server Component.
// Recibe grupos ya resueltos (labels + FacetOption props) — la lógica de
// facetas vive en apps/web/lib/plp.ts; esto solo compone.
import { FacetOption } from "../../molecules/FacetOption/FacetOption";
import { PriceRange } from "../../molecules/PriceRange/PriceRange";
import styles from "./FacetPanel.module.scss";

export type FacetGroupData = {
  readonly key: string;
  readonly title: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
    readonly count?: number;
    readonly checked: boolean;
    readonly disabled: boolean;
    readonly href: string;
    readonly hex?: string;
  }[];
  /** Si el grupo es precio, renderiza PriceRange en vez de opciones. */
  readonly price?: {
    readonly min: number | undefined;
    readonly max: number | undefined;
    readonly minLabel: string;
    readonly maxLabel: string;
    readonly applyLabel: string;
    readonly hidden: readonly { name: string; value: string }[];
  };
};

type FacetPanelProps = {
  groups: readonly FacetGroupData[];
  /** Filtros activos como chips removibles (href = quitar ese filtro). */
  activeChips?: readonly { label: string; href: string; removeLabel: string }[];
  clearHref?: string;
  clearLabel?: string;
};

export function FacetPanel({ groups, activeChips = [], clearHref, clearLabel }: FacetPanelProps) {
  return (
    <div className={styles.panel}>
      {(activeChips.length > 0 || clearHref) && (
        <div className={styles.active}>
          {activeChips.map((chip) => (
            <a
              key={chip.label}
              href={chip.href}
              className={styles.chip}
              aria-label={`${chip.removeLabel}: ${chip.label}`}
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </a>
          ))}
          {clearHref && clearLabel && (
            <a href={clearHref} className={styles.clear}>
              {clearLabel}
            </a>
          )}
        </div>
      )}
      {groups.map((group) =>
        group.price ? (
          <section key={group.key} className={styles.group} aria-labelledby={`facet-${group.key}`}>
            <h2 id={`facet-${group.key}`} className={styles.title}>
              {group.title}
            </h2>
            <PriceRange
              minValue={group.price.min}
              maxValue={group.price.max}
              labels={{
                min: group.price.minLabel,
                max: group.price.maxLabel,
                apply: group.price.applyLabel,
              }}
              hidden={group.price.hidden}
            />
          </section>
        ) : (
          <details
            key={group.key}
            className={styles.group}
            open={group.options.some((option) => option.checked)}
          >
            <summary id={`facet-${group.key}`} className={styles.title}>
              {group.title}
              <span aria-hidden="true" className={styles.caret} />
            </summary>
            <ul className={styles.options}>
              {group.options.map((option) => (
                <li key={option.value}>
                  <FacetOption
                    href={option.href}
                    label={option.label}
                    count={option.count}
                    checked={option.checked}
                    disabled={option.disabled}
                    lead={
                      option.hex ? (
                        <span
                          className={styles.miniSwatch}
                          style={{ backgroundColor: option.hex }}
                          aria-hidden="true"
                        />
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          </details>
        ),
      )}
    </div>
  );
}
