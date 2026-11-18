// Server Component: indicador de carga circular (distinto del skeleton: para esperas
// sin forma conocida, p. ej. acciones). Reduced-motion lo deja estático.
import styles from "./Spinner.module.scss";

type SpinnerProps = {
  label?: string;
  className?: string;
};

export function Spinner({ label, className }: SpinnerProps) {
  return (
    <span className={[styles.spinner, className].filter(Boolean).join(" ")} role="status">
      <span className={styles.dots} aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  );
}
