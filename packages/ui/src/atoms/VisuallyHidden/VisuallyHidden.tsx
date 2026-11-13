// Server Component: solo marcado, sin interactividad.
import type { ReactNode } from "react";
import styles from "./VisuallyHidden.module.scss";

type VisuallyHiddenProps = {
  children: ReactNode;
};

/** Contenido disponible para lectores de pantalla pero oculto visualmente. */
export function VisuallyHidden({ children }: VisuallyHiddenProps) {
  return <span className={styles.root}>{children}</span>;
}
