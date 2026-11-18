"use client";

// Scroll infinito de la PLP (R12): fetch de /api/plp?page=n con la misma query
// canónica. Restaura la posición y las páginas cargadas al volver de la PDP
// (sessionStorage). El fallback sin JS es la paginación clásica (SSR).
import { useCallback, useEffect, useRef, useState } from "react";
import type { CardProduct } from "@nudo/commerce/card";
import type { Locale } from "@nudo/i18n/config";
import { ProductGrid } from "@nudo/ui/organisms/ProductGrid";
import { Button } from "@nudo/ui/atoms/Button";

type GridItem = { product: CardProduct; initialVariantId: string };

// Misma regla que el SSR: /{locale}/p/{slug}?v={variantId}.
const hrefForVariant = (locale: Locale) => (product: CardProduct, variantId: string) =>
  `/${locale}/p/${product.slug[locale]}?v=${variantId}`;

type InfiniteGridProps = {
  locale: Locale;
  items: readonly GridItem[];
  /** Query canónica sin `page` (la agrega el fetch). */
  query: string;
  pageCount: number;
  labels: {
    loadMore: string;
    loading: string;
    card: Parameters<typeof ProductGrid>[0]["labels"];
  };
};

type PagePayload = { products: CardProduct[]; page: number; pageCount: number };

const MAX_PAGES = 10; // límite de DOM: máx. 10 páginas acumuladas (R12)
// La clave incluye pathname + query: cada combinación de filtros restaura lo suyo.
const storageKey = () => `nudo-plp:${window.location.pathname}${window.location.search}`;

export function InfiniteGrid({ locale, items, query, pageCount, labels }: InfiniteGridProps) {
  const [grid, setGrid] = useState<GridItem[]>(() => [...items]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(pageCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  const fetchPage = useCallback(
    async (next: number) => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/plp?locale=${locale}&${query}&page=${next}`, {
          headers: { accept: "application/json" },
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as PagePayload;
        setGrid((prev) => [
          ...prev,
          ...data.products.map((product) => ({
            product,
            initialVariantId: product.defaultVariantId,
          })),
        ]);
        setPage(data.page);
        setPages(data.pageCount);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [locale, query],
  );

  // Restaurar páginas cargadas + scroll al volver (sessionStorage por pathname).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const saved = sessionStorage.getItem(storageKey());
      if (!saved) return;
      const { pages: savedPages, scrollY } = JSON.parse(saved) as {
        pages: number;
        scrollY: number;
      };
      const target = Math.min(savedPages, pages);
      if (target > 1) {
        (async () => {
          for (let p = 2; p <= target; p++) await fetchPage(p);
          requestAnimationFrame(() => window.scrollTo(0, scrollY));
        })();
      } else if (scrollY > 0) {
        requestAnimationFrame(() => window.scrollTo(0, scrollY));
      }
    } catch {
      /* sessionStorage no disponible: seguir con la página 1 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar estado al salir de la página.
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(
          storageKey(),
          JSON.stringify({ pages: page, scrollY: window.scrollY }),
        );
      } catch {
        /* noop */
      }
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [page]);

  // IntersectionObserver: carga la siguiente página al acercarse al final.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || page >= pages || page >= MAX_PAGES) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading) fetchPage(page + 1);
      },
      { rootMargin: "800px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [page, pages, loading, fetchPage]);

  const canLoadMore = page < pages && page < MAX_PAGES;

  return (
    <div className="infinite-grid">
      <ProductGrid
        products={grid}
        locale={locale}
        hrefForVariant={hrefForVariant(locale)}
        labels={labels.card}
      />
      <div ref={sentinelRef} aria-hidden="true" />
      {canLoadMore && (
        <div style={{ justifySelf: "center" }}>
          <Button
            variant="secondary"
            busy={loading}
            label={loading ? labels.loading : labels.loadMore}
            onClick={() => fetchPage(page + 1)}
          >
            {labels.loadMore}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" style={{ justifySelf: "center" }}>
          <Button variant="ghost" onClick={() => fetchPage(page + 1)}>
            {labels.loadMore}
          </Button>
        </p>
      )}
    </div>
  );
}
