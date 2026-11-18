"use client";

// Error global (R22): último recurso fuera del layout de locale.
// Debe renderizar <html> y <body> propios. Sin contexto de locale: usa el default.
import { defaultLocale } from "@nudo/i18n/config";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang={defaultLocale}>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          gap: "1rem",
          justifyItems: "start",
          padding: "3rem 1rem",
        }}
      >
        <h1>Algo salió mal</h1>
        <p>Ocurrió un error inesperado. Probá de nuevo en unos segundos.</p>
        <button type="button" onClick={reset}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
