// Indicador de pasos del checkout (R16): ol con done/current/todo según el catálogo.
// Los pasos anteriores linkean a su URL; los futuros no.
import { Link } from "../../atoms/Link/Link";
import styles from "./StepIndicator.module.scss";

export type StepItem = {
  readonly key: string;
  readonly label: string;
  readonly href?: string;
  readonly state: "done" | "current" | "todo";
};

type StepIndicatorProps = {
  steps: readonly StepItem[];
  label: string;
};

export function StepIndicator({ steps, label }: StepIndicatorProps) {
  return (
    <nav className={styles.steps} aria-label={label}>
      <ol>
        {steps.map((step) => (
          <li
            key={step.key}
            className={step.state === "done" ? styles["is-done"] : undefined}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            {step.state === "done" && step.href ? (
              <Link href={step.href} variant="quiet">
                <span>{step.label}</span>
              </Link>
            ) : (
              <span>{step.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
