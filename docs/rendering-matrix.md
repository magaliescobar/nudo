# Matriz de rendering — NUDO web

Cómo renderiza cada ruta bajo `cacheComponents: true` + `partialPrefetching` (Next.js 16.4.6). Ver ADR 018 para el porqué de las guardas en `proxy.ts`.

Leyenda: `◐` Partial Prerender · `ƒ` dinámica · `○` estática · `=false` `instant = false` (ruta blocking: runtime data fuera de `<Suspense>`, HTML completo por request).

## Páginas

| Ruta                          | Modo | instant | Datos                                                                             | Suspense / streaming                                     | Status real (documento)                                                            | Sin JS                            |
| ----------------------------- | ---- | ------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------- |
| `/{locale}`                   | ◐    | —       | Hero/categorías estáticos; Novedades `use cache`; Últimas unidades `connection()` | Últimas unidades streamea tras el shell (stock-sensible) | 404 locale inválido vía `notFound()` en página                                     | Hero + novedades + skeleton       |
| `/{locale}/p/{slug}`          | ◐    | false   | `getProductBySlug` (cache `catalog`+`stock`), `?v`/`?i` request                   | Ninguno — awaits directos                                | 404 vía `page-guard` (kind=product, fail-open)                                     | Completo: galería, variantes, ATC |
| `/{locale}/c/{path...}`       | ◐    | false   | `resolveCategoryPath`, PLP `use cache` (results+facets+stock)                     | Ninguno — awaits directos                                | 404/redirect canónico vía `page-guard` (kind=category)                             | Completo: facetas GET, paginación |
| `/{locale}/search`            | ◐    | false   | PLP `use cache` por query canónica                                                | Ninguno — awaits directos                                | `notFound()` locale; page overflow → redirect página                               | Completo                          |
| `/{locale}/cart`              | ◐    | false   | `getCartId()` cookie + carrito privado (Redis, sin `use cache`)                   | Ninguno — awaits directos                                | 404 locale; `noindex`                                                              | Completo: líneas, cantidades, CTA |
| `/{locale}/checkout/{step}`   | ◐    | false   | Sesión checkout (Redis privado) + carrito                                         | Ninguno — awaits directos                                | 404 step inválido, 307 paso/redirect vía `page-guard` (kind=checkout, fail-closed) | Completo: 5 pasos, errores `?e=`  |
| `/{locale}/order/{number}`    | ◐    | false   | Pedido por `number+token` contra Mongo                                            | Ninguno — awaits directos                                | 404 token inválido vía `order-access` (fail-closed)                                | Completo                          |
| `/{locale}/error` `not-found` | ○/◐  | —       | Estáticos/localizados                                                             | —                                                        | —                                                                                  | Completo                          |

## Route handlers y proxy

| Ruta                             | Modo | Notas                                                                                                    |
| -------------------------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| `proxy.ts`                       | —    | `guardOrderAccess` → `guardPageAccess` (solo `Sec-Fetch-Dest: document`) → negociación locale/request-id |
| `/api/internal/order-access`     | ƒ    | Bearer `INTERNAL_API_SECRET`, fail-closed, `no-store`+`noindex`                                          |
| `/api/internal/page-guard`       | ƒ    | `kind=product\|category\|checkout`; catálogo fail-open, checkout fail-closed                             |
| `/api/internal/invalidate`       | ƒ    | `POST` tags / `GET` log; rate-limit-first, secreto constant-time                                         |
| `/api/internal/stats`            | ƒ    | Contadores por instancia (tests de stampede)                                                             |
| `/api/health`                    | ƒ    | Healthcheck                                                                                              |
| `/api/plp`, `/api/products/[id]` | ƒ    | API pública de catálogo (tests, `InfiniteGrid`)                                                          |

## Notas

- Todas las páginas ◐ con `instant = false` renderizan **bloqueantes**: la respuesta espera a los awaits y entrega HTML íntegro; el símbolo ◐ del build refleja que el shell sigue prerenderizándose, no que haya streaming de contenido en estas rutas.
- El único streaming deliberado de la tienda es «Últimas unidades» en home (stock-sensible, `connection()` + Suspense).
- Los status 404/307/303 reales de documento los decide `proxy.ts` **antes** de que se emita cualquier byte (ADR 018); las páginas repiten los guards como respaldo para navegaciones RSC.
- `Cache-Control` de páginas: `private, no-cache` (dinámicas por cookie/parámetros). Assets `/catalog/*` y `/_next/static/*` públicos con `max-age`/`stale-while-revalidate`.
