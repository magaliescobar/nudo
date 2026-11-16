import { VisuallyHidden } from "@nudo/ui/atoms/VisuallyHidden";
import styles from "./page.module.scss";

// Placeholder de la Fase 0: la Home real (R10) y sus textos localizados (R25) llegan en fases siguientes.
export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.brand}>
        NUDO
        <VisuallyHidden> · Mini Commerce</VisuallyHidden>
      </h1>
    </main>
  );
}
