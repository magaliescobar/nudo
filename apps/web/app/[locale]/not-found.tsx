import Link from "next/link";
import styles from "./not-found.module.scss";

export default function NotFound() {
  return (
    <div className={styles.nf}>
      <h1>Página no encontrada</h1>
      <p>La página que buscás no existe o fue movida.</p>
      <Link href="/">Volver al inicio</Link>
    </div>
  );
}
