// Campo de formulario (R16): label + input + hint/error accesibles.
// El error se asocia con aria-describedby y aria-invalid (Input ya lo recibe).
import type { InputHTMLAttributes, ReactNode } from "react";
import { Input } from "../../atoms/Input/Input";
import { Icon } from "../../atoms/Icon/Icon";
import styles from "./FormField.module.scss";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
  /** Para selects/textarea en el futuro; hoy siempre Input. */
  children?: ReactNode;
};

export function FormField({
  label,
  hint,
  error,
  optional = false,
  optionalLabel,
  id,
  children,
  ...rest
}: FormFieldProps) {
  // Id determinista (SSR/CSR estables): sale del label salvo que el caller pase `id`.
  const fieldId =
    id ??
    `field-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={[styles.field, error && styles["is-error"]].filter(Boolean).join(" ")}>
      <label htmlFor={fieldId}>
        {label}
        {optional && <span className={styles.optional}>{optionalLabel}</span>}
      </label>
      {children ?? (
        <Input id={fieldId} invalid={Boolean(error)} aria-describedby={describedBy} {...rest} />
      )}
      {error && (
        <span className={styles.error} id={errorId} role="alert">
          <Icon name="alert" size="sm" />
          {error}
        </span>
      )}
      {hint && !error && (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}
