// Server Component: checkbox nativo estilado. El label envolvente lo compone
// FacetOption/FormField; acá solo el control con su marca visual.
import type { InputHTMLAttributes } from "react";
import styles from "./Checkbox.module.scss";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function Checkbox({ className, ...rest }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={[styles.check, className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}
