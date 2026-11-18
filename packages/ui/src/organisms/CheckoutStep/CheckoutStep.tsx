// CheckoutStep (R16): wrapper de un paso del checkout. El form usa method="post"
// + server action: funciona sin JS (redirect tras POST) y con JS el caller puede
// envolverlo en useActionState para errores inline.
import type { ReactNode } from "react";
import { Button } from "../../atoms/Button/Button";
import { Link } from "../../atoms/Link/Link";
import styles from "./CheckoutStep.module.scss";

type CheckoutStepProps = {
  title: string;
  /** server action del paso (recibe FormData). */
  action: (formData: FormData) => void | Promise<void>;
  /** hidden inputs que preservan estado (p. ej. step). */
  hidden?: readonly { name: string; value: string }[];
  submitLabel: string;
  backHref?: string;
  backLabel?: string;
  /** Errores globales del paso (no por campo). */
  errors?: readonly string[];
  children: ReactNode;
};

export function CheckoutStep({
  title,
  action,
  hidden = [],
  submitLabel,
  backHref,
  backLabel,
  errors = [],
  children,
}: CheckoutStepProps) {
  return (
    <section className={styles.step} aria-labelledby="checkout-step-title">
      <h1 id="checkout-step-title" className={styles.title}>
        {title}
      </h1>
      <form action={action} className={styles.form}>
        {hidden.map((field) => (
          <input key={field.name} type="hidden" name={field.name} value={field.value} />
        ))}
        {children}
        {errors.length > 0 && (
          <div className={styles.errors} role="alert">
            <ul>
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        <div className={styles.actions}>
          {backHref && backLabel && (
            <Link href={backHref} variant="quiet">
              {backLabel}
            </Link>
          )}
          <Button type="submit" variant="primary">
            {submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}
