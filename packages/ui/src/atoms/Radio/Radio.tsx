// Server Component: radio nativo estilado (talles, método de entrega, variantes).
import type { InputHTMLAttributes } from "react";
import styles from "./Radio.module.scss";

type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function Radio({ className, ...rest }: RadioProps) {
  return (
    <input type="radio" className={[styles.radio, className].filter(Boolean).join(" ")} {...rest} />
  );
}
