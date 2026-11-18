"use client";

// Error boundary localizado (R22): reset() reintenta el render del segmento.
import { useEffect } from "react";
import { Button } from "@nudo/ui/atoms/Button";
import styles from "./error.module.scss";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.error} role="alert">
      <h1>Algo salió mal</h1>
      <p>No pudimos cargar esta página. Probá de nuevo en unos segundos.</p>
      <Button variant="primary" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
