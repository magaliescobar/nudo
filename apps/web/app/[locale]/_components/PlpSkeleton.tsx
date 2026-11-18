import { Skeleton } from "@nudo/ui/atoms/Skeleton";
import styles from "../plp-skeleton.module.scss";

export function PlpSkeleton() {
  return (
    <div className={styles.plpSkel} aria-busy="true">
      <div className={styles.toolbar}>
        <Skeleton width="8rem" height="1rem" />
        <Skeleton width="16rem" height="1rem" />
      </div>
      <div className={styles.body}>
        <div className={styles.facets}>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} height="2.5rem" />
          ))}
        </div>
        <ul className={styles.grid}>
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <Skeleton height="100%" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
