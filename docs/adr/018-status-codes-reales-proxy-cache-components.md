# ADR 018 · Status codes reales bajo Cache Components (pre-validación en Proxy)

- Estado: aceptado (Fase 3)
- Requerimientos: R10–R17, R21, R22; entregables § SEO/errores

## Contexto

Con `cacheComponents: true` todas las rutas dinámicas renderizan como Partial Prerender (◐): el runtime emite el shell estático y luego streamea el contenido. Consecuencia: `notFound()`, `redirect()` o `forbidden()` invocados **dentro del render** ocurren después de que la respuesta ya salió con HTTP 200, así que el status real se pierde y el cliente resuelve el error en el router.

`export const instant = false` permite que el runtime data viva fuera de `<Suspense>` (ruta "blocking", HTML íntegro sin JS), pero **no** garantiza status codes reales ni convierte la ruta en `ƒ`: el shell PPR igual puede emitirse primero. Tampoco hay hoy una API de Next 16 para "optar fuera" del PPR por ruta.

## Decisión

Las comprobaciones que afectan al **status HTTP de un document request** se hacen en `proxy.ts`, antes del render, llamando a un endpoint interno:

- `GET /api/internal/order-access?number=&token=` (Fase 3, pedido tokenizado): fail-**closed**. 404 real si el token no valida, 503 si el guard no responde.
- `GET /api/internal/page-guard?kind=product|category|checkout&…` (nuevo): resuelve existencia/publicación de slug, validez del path de categoría y paso/acceso del checkout. Catálogo: fail-**open** (si el guard cae, la página decide con sus propios guards). Checkout: fail-closed donde afecta a privacidad.

`proxy.ts` solo ejecuta estas guardas cuando `Sec-Fetch-Dest: document` (navegación real). Las peticiones RSC, prefetch y Server Actions viajan con `sec-fetch-dest: empty` y **no** se cortan: el router cliente ya maneja `notFound()`/`redirect()` del render streameado.

Los headers `RSC`/`next-router-prefetch`/`_rsc` no son fiables para esta distinción porque Next los consume antes del proxy.

Las páginas conservan sus guards internos (`notFound()`, `redirect()`, `connection()`) como fallback semántico para navegaciones cliente y para requests que no sean documento.

## Consecuencias

- Document requests directos obtienen 404/307/303 reales; RSC y prefetch siguen el camino streameado sin doble latencia de guard.
- Un miss del guard en catálogo degrada a "fail-open": peor caso, un 200 con not-found streameado en vez de un 404 real.
- Cada document request a PDP/categoría/checkout paga un fetch interno (cacheado por `use cache` en las lecturas de catálogo); el costo es una consulta Redis/Mongo cacheada, no una query por request en caliente.
- Si Next agrega un opt-out oficial de PPR por ruta, este ADR se revisa.
