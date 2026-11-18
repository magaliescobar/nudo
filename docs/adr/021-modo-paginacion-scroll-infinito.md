# ADR 021 · Modo paginación vs scroll infinito en la PLP

- Estado: aceptado (Fase 3)
- Requerimientos: R12; entregables hint § PLP

## Contexto

R12 pide elegir entre paginación clásica e infinite scroll (o ambos con selector). La elección afecta a UX, SEO, accesibilidad, caché y comportamiento sin JS.

## Decisión

**Los dos modos, conmutables por `?view=pagination|infinite` en la URL** (default: `pagination`).

- El modo forma parte del estado de la URL (ADR 020), no de una cookie ni de `localStorage`: una URL compartida reproduce exactamente la vista que vio quien la envió, y no rompe la caché por usuario.
- `pagination` renderiza enlaces `?page=N` server-side: funciona sin JS, es rastreable y cada página es una respuesta completa.
- `infinite` renderiza la primera página server-side y `InfiniteGrid` (cliente) pide las siguientes vía la misma ruta con `?page=N` y el mismo estado de filtros; sin JS el toggle a `pagination` sigue disponible y la primera página ya es usable.
- El toggle es un `ViewToggle` con links GET (no un botón con estado cliente), así el cambio de modo es una navegación real y back/forward funciona.

## Consecuencias

- SEO/indexación: los crawlers ven paginación por defecto; el modo infinito no es requisito de indexación.
- La preferencia no persiste entre visitas (es por URL): se prefirió corrección de compartición sobre conveniencia de memoria — documentado como decisión consciente.
- Doble superficie de UI (grid paginado + grid infinito) cubierta por los mismos tests Playwright.
