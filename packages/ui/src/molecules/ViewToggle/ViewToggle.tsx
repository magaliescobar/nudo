"use client";

// Preferencia de vista PLP (R12): paginación clásica o scroll infinito.
// Persiste en localStorage; el SSR siempre entrega paginación (crawlable, no-JS).
// Al montar, si la preferencia guardada es "infinite" y la URL no la trae,
// reemplaza la URL con ?view=infinite (router.replace, sin entrada en historial).
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Link } from "../../atoms/Link/Link";
import styles from "./ViewToggle.module.scss";

const storageKey = "nudo-plp-view";

type ViewToggleProps = {
  view: "pagination" | "infinite";
  hrefs: { pagination: string; infinite: string };
  labels: { label: string; pagination: string; infinite: string };
};

export function ViewToggle({ view, hrefs, labels }: ViewToggleProps) {
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "infinite" && view !== "infinite") {
        const url = new URL(window.location.href);
        url.searchParams.set("view", "infinite");
        router.replace(`${url.pathname}${url.search}`);
      }
    } catch {
      /* storage no disponible */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (mode: "pagination" | "infinite") => () => {
    try {
      localStorage.setItem(storageKey, mode);
    } catch {
      /* noop */
    }
  };

  return (
    <div className={styles.toggle} role="group" aria-label={labels.label}>
      <Link
        href={hrefs.pagination}
        variant="quiet"
        aria-current={view === "pagination" ? true : undefined}
        onClick={choose("pagination")}
      >
        {labels.pagination}
      </Link>
      <Link
        href={hrefs.infinite}
        variant="quiet"
        aria-current={view === "infinite" ? true : undefined}
        onClick={choose("infinite")}
      >
        {labels.infinite}
      </Link>
    </div>
  );
}
