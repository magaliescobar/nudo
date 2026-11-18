# Progreso

Estado por fase del plan de `NUDO-AGENT-INSTRUCTIONS.md` §4. Un requerimiento se marca cumplido solo con evidencia reproducible (test, script o medición).

## Fase 0 — Descubrimiento y andamiaje · cerrada (2026-11-13)

### Cubierto

| Ítem                                                                                                           | Evidencia                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Monorepo pnpm workspaces: `apps/web` + `packages/{config,tokens,i18n,commerce,data,ui}` (ADR 003)              | `pnpm install`, `pnpm build`                                                                 |
| Turbopack en dev y build, `turbopack.root`, `transpilePackages`, Sass entre paquetes con `loadPaths`           | `pnpm build` muestra `(Turbopack)`; `@use 'tokens'` compila desde `apps/web` y `packages/ui` |
| `.env.local` en la raíz, cargado por `next.config.ts`; validación server-only de `MONGODB_URI`/`REDIS_URL`     | `packages/data/src/env.ts`                                                                   |
| Fronteras R01 y composición atómica, con test de que los imports prohibidos fallan                             | `pnpm test:api` → `tests/api/r01-boundaries.spec.ts`                                         |
| `server-only` en `@nudo/data`: un Client Component que lo importa rompe el build                               | mismo test (build aislado en `.next-r01-probe`)                                              |
| Tooling: ESLint, Prettier, Stylelint, Playwright (`chromium`, `mobile`, `no-js`, `api`), `pnpm check`          | `pnpm check`                                                                                 |
| ADR 001 (versiones y gestor), 002 (Atomic Design sin catálogo, tokens, diferencias entre HTML), 003 (monorepo) | `docs/adr/`                                                                                  |
| `.env.example` con placeholders                                                                                | `.env.example`                                                                               |

### Parcial

- **R01:** las fronteras están activas; el resto de la arquitectura (adaptadores, capas de datos) llega con las fases siguientes.
- **R07:** Stylelint prohíbe `@import`, hex/`rgb()` fuera de tokens, `!important` sin justificación y nesting > 3. Falta la regla de valores mágicos para tamaños, sombras y duraciones (Fase 1, cuando existan los tokens).
- **R08 (parcial por exclusión):** estructura `atoms/molecules/organisms` y reglas de composición listas; solo existe `VisuallyHidden`.

### Deuda conocida

- `apps/web/app/layout.tsx` sigue usando Geist; se reemplaza por Archivo con `next/font` en la Fase 1 (R36).
- `page.module.scss` usa `token('space-xl')` y `token('text-display')`, que todavía no están definidos como custom properties (llegan con R06).
- `apps/web/cache-handlers/redis-handler.js` es el handler heredado: no implementa tags (4 warnings de ESLint por parámetros sin usar). Se reemplaza en la Fase 2 (R20).
- Tests de UI y a11y de la Fase 0 son de humo sobre la página placeholder.

## Fase 1 — Fundaciones: tokens, SCSS, i18n, datos, Redis, seed

Estado: **cerrada** (`pnpm check` verde: formato, ESLint sin errores, Stylelint, typecheck, build Turbopack, 30 tests Playwright).

| Req          | Estado                                                                                                                                  | Evidencia                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| R06 tokens   | Hecho: fuente única `packages/tokens/src/tokens.ts`, 3 niveles tipados, temas light/dark/drop/auto, build reproducible                  | `tests/api/r06-r07-tokens-scss.spec.ts`, `docs/design-tokens-map.md` |
| R07 SCSS     | Hecho: API `token()`/`breakpoint()`/`motion()` + mixins, capas, Archivo con `next/font`, Stylelint sin valores mágicos, sin duplicación | `tests/api/r06-r07-tokens-scss.spec.ts`, `pnpm lint:styles`          |
| R24          | Hecho en Fase 3: selector de idioma en header/footer (links GET), home/PLP/PDP completos en ES/EN                                       | `tests/api/r24-r26-i18n.spec.ts`, `tests/ui/smoke.spec.ts`           |
| R25          | Hecho en Fase 3: textos de UI de todo el funnel localizados; medición de bundle pendiente                                               | `tests/api/r24-r26-i18n.spec.ts`                                     |
| R26          | Mecanismo hecho; procedimiento en README                                                                                                | test "páginas y componentes no nombran idiomas concretos"            |
| R02          | Hecho en Fase 3: PLP con facetas en una consulta Atlas Search (`/api/plp`), facetas con conteos, búsqueda `q`                           | `tests/api/phase3-commerce.spec.ts`                                  |
| R03          | Hecho: timeouts, breaker, 6 responsabilidades, modo degradado (ADR 005); conectado a carrito/checkout/sesiones en Fase 3                | `tests/api/r03-redis.spec.ts`, `docs/redis-keys.md`                  |
| Seed         | Hecho: 13 categorías, 300 productos, 4856 SKUs (748 sin stock), 3 discontinuados, 2 redirects, 54 imágenes; idempotente                 | `pnpm db:seed` (2.ª corrida: 0 imágenes nuevas, índice `updated`)    |
| R18 contrato | ADR 004                                                                                                                                 | —                                                                    |

Deuda que pasa a la Fase 2: el cache handler legado (4 warnings de ESLint) se reemplaza por la caché multinivel.

## Fase 2 — Caché, multi-instancia y observabilidad

Estado: **cerrada con un pendiente explícito** (el test de matar una instancia se ejercita sobre el recorrido de catálogo/API; el checkout ya existe desde la Fase 3 pero el kill "a mitad del checkout" sigue pendiente).

| Req                   | Estado                                                                                                                                                                    | Evidencia                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| R20 perfiles y tags   | Hecho: `catalog` / `stock` / `editorial` en `next.config.ts`; convención `product:` `category:` `stock:` `locale:` `catalog` `editorial`                                  | `docs/caching.md`, `packages/data/src/cache/tags.ts`                           |
| R20 L1 + L2 + pub/sub | Hecho: `apps/web/cache-handlers/nudo-handler.js` (interfaz de Next 16.4.6), `CACHE_L1_PUBSUB` para Vercel                                                                 | ADR 006, `tests/multi` (miss en web-1 ⇒ hit en web-2/3)                        |
| R20 dedupe            | Hecho: `React.cache` sobre cada lectura de `apps/web/lib/catalog.ts`                                                                                                      | —                                                                              |
| R20 stampede          | Hecho: lock `SET NX PX` + espera en L2 + single-flight local                                                                                                              | 100 requests / 1 instancia y 150 / 3 instancias ⇒ 1 consulta a Atlas por clave |
| R20 Cache-Control     | Hecho: assets, imágenes fuente, route handlers y páginas (`private, no-cache` en dinámicas)                                                                               | `docs/caching.md`                                                              |
| R20 nada privado      | Hecho: carrito/checkout fuera de `'use cache'`; el endpoint interno rechaza tags fuera de convención                                                                      | `tests/api/r20-r05-cache.spec.ts`                                              |
| R04                   | Hecho: Dockerfile multi-stage (standalone), compose con 3 instancias + nginx sin Redis/Mongo propios, `x-instance-id`, `deploymentId` y clave de Server Actions comunes   | ADR 007, ADR 008, `tests/multi/r04-multi-instance.spec.ts`                     |
| R04 matar instancia   | Parcial: `docker compose kill web-2` a mitad del recorrido de catálogo ⇒ todos los requests 200 en otras instancias. Falta repetirlo dentro del checkout                  | `tests/multi`                                                                  |
| R05                   | Hecho: `Server-Timing` (`catalog`, `redis`, `cache` hit/miss/stale, `total`), logs JSON con instancia/ruta/locale/request id, log de tags invalidados; visible en PDP/PLP | `tests/api/r20-r05-cache.spec.ts`, `tests/ui/commerce.spec.ts`                 |
| §3.4 herramienta      | Hecho: `pnpm catalog:*` + `POST/GET /api/internal/invalidate` + `/api/internal/stats` (secreto en tiempo constante, rate limit, noindex)                                  | ADR 017                                                                        |

Notas:

- El cuerpo de `'use cache'` corre fuera del `AsyncLocalStorage` del request: en un miss el tiempo de Mongo se ve dentro de `catalog;dur`, y las consultas en `/api/internal/stats` (ADR 006).
- `pnpm env:secrets` agregó a `.env.local` `INTERNAL_API_SECRET` y `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (sin sobrescribir).
- Vercel: `docs/deploy-vercel.md`. Los nombres de variables que inyecta Vercel al provisionar Redis quedan por verificar.
- Multi-instancia: `NEXT_DEPLOYMENT_ID=… docker compose up --build -d` y `MULTI_BASE_URL=http://localhost:8080 pnpm test:multi`.

## Fase 3 — Comercio: home, PLP, PDP, carrito, checkout y pedido

Estado: **implementada y verificada** (`pnpm check` verde; 72 tests Playwright api+chromium+mobile+no-js; 5 tests multi-instancia). Matriz de rendering en `docs/rendering-matrix.md`.

| Req                   | Estado                                                                                                                                                           | Evidencia                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| R10 home              | Hecho: hero/categorías estáticos en shell; Novedades `use cache` visibles sin JS; Últimas unidades streameadas (`connection()`+Suspense, stock-sensible)         | `tests/ui/commerce.spec.ts` (proyecto no-js), `tests/a11y/home.spec.ts`      |
| R11 PLP               | Hecho: `/{locale}/c/{path...}` y `/search`, URL-driven (`q`,`color`,`size`,`sort`,`page`,`view`), Atlas Search con facetas+conteos en una consulta               | `tests/api/phase3-commerce.spec.ts`, `tests/ui/commerce.spec.ts`             |
| R12 paginación/scroll | Hecho: `?view=pagination\|infinite`, default paginación; `InfiniteGrid` cliente sobre la misma ruta; modo en URL (ADR 021)                                       | `tests/ui/commerce.spec.ts`                                                  |
| R13 tarjetas          | Hecho: swatches de variante, estados de stock ("Últimas unidades"/agotado), precios con oferta, todo desde DTO serializable                                      | `tests/ui/commerce.spec.ts`, `tests/a11y/commerce.spec.ts`                   |
| R14 PDP               | Hecho: galería, selector de variante dentro del `<form>` (funciona sin JS), `?v`/`?i` no canónicos, canonical único, `notFound` por slug                         | `tests/ui/commerce.spec.ts` (no-js ATC), `tests/api/phase3-commerce.spec.ts` |
| R15 carrito           | Hecho: cookie `NUDO_CART` httpOnly, Server Actions, líneas/cantidades/CTA, drawer con JS y página completa sin JS, `noindex`                                     | `tests/ui/commerce.spec.ts`, `tests/api/phase3-commerce.spec.ts`             |
| R16 checkout          | Hecho: 5 pasos (contact→shipping→delivery→payment→review), sesión en Redis con idempotency key, validación Valibot, errores `?e=` sin JS, pago fake determinista | `tests/ui/commerce.spec.ts`, `tests/api/phase3-commerce.spec.ts`             |
| R17 pedido            | Hecho: confirmación idempotente → redirect a `/{locale}/order/{number}?token=…`; acceso validado en proxy (404 real, fail-closed); `noindex`                     | `tests/api/phase3-commerce.spec.ts`, `tests/multi`                           |
| R21 loading           | Hecho: `plp-skeleton`, `GridSkeleton`, `loading` states; streaming solo en Últimas unidades                                                                      | `tests/ui/commerce.spec.ts`                                                  |
| R22 errores           | Hecho: `error.tsx`/`not-found.tsx` localizados, estados vacíos de búsqueda/carrito/pedido, status reales 404/307 en documento (ADR 018)                          | `tests/ui/commerce.spec.ts` (no-js), `tests/api/phase3-commerce.spec.ts`     |
| Seguridad             | Hecho: CSP estática + headers (ADR 022), guards internos fail-closed (order-access, page-guard checkout), rate-limit+secreto en `/api/internal/*`                | `tests/api/*.spec.ts`, `curl -sI`                                            |
| a11y                  | Hecho: axe WCAG A/AA en home, PLP, PDP, carrito, checkout, pedido; tokens `ink-600`/`coral-700` para contraste AA; `aria-current` en facetas                     | `tests/a11y/*.spec.ts`                                                       |

ADRs nuevos: 018 (status codes reales vía proxy bajo Cache Components), 019 (checkout sin JS), 020 (URLs canónicas variantes/facetas), 021 (paginación vs scroll), 022 (CSP sin nonce), 023 (comercio invitado sin auth), 024 (i18n propia).

Notas:

- `firstIncompleteStep()` devuelve el primer paso **incompleto** por datos (contact→…→review), no el primero inaccesible: evita loops de redirect al entrar directo a `/checkout/shipping` sin sesión (bug encontrado en tests).
- Las guardas de `proxy.ts` solo corren con `Sec-Fetch-Dest: document`; RSC/prefetch/actions (`empty`) pasan al render streameado sin doble latencia.
- `page-guard` catálogo es fail-open (una caída del guard no tira la tienda); checkout y order-access son fail-closed.
- Deuda conocida: warnings de `cacheTag()` cuando un PLP cachea stock de miles de SKUs (Next descarta tags sobre el máximo); la frescura queda acotada por `expire` del perfil `stock` (300 s). Pendiente: medir bundle de la PDP (R25) y probar kill de instancia a mitad del checkout.
