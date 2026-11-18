// Server Component: input de texto estilado (.input del catálogo).
// Estados: default, is-focus (solo visual en catálogo), error (aria-invalid + .err lo
// maneja FormField), disabled. Sin lógica: las validaciones viven en schemas.
import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.scss";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ invalid, className, ...rest }: InputProps) {
  return (
    <input
      className={[styles.input, invalid && styles["is-error"], className].filter(Boolean).join(" ")}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
