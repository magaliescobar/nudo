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

| Req          | Estado                                                                                                                                       | Evidencia                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| R06 tokens   | Hecho: fuente única `packages/tokens/src/tokens.ts`, 3 niveles tipados, temas light/dark/drop/auto, build reproducible                       | `tests/api/r06-r07-tokens-scss.spec.ts`, `docs/design-tokens-map.md` |
| R07 SCSS     | Hecho: API `token()`/`breakpoint()`/`motion()` + mixins, capas, Archivo con `next/font`, Stylelint sin valores mágicos, sin duplicación      | `tests/api/r06-r07-tokens-scss.spec.ts`, `pnpm lint:styles`          |
| R24          | Parcial: `[locale]`, `generateStaticParams`, `lang`/`dir`, negociación en `proxy.ts`. Falta el selector de idioma (necesita PLP/PDP, Fase 3) | `tests/api/r24-r26-i18n.spec.ts`, `tests/ui/smoke.spec.ts`           |
| R25          | Parcial: diccionarios tipados solo-servidor, `Intl`, fallback de contenido (ADR 015). Falta medir el bundle de la PDP (Fase 3)               | `tests/api/r24-r26-i18n.spec.ts`                                     |
| R26          | Mecanismo hecho; procedimiento en README                                                                                                     | test "páginas y componentes no nombran idiomas concretos"            |
| R02          | Hecho: singleton + pool, repositorios, índices, Atlas Search, stock atómico. Falta la PLP con facetas en una consulta (Fase 3)               | `tests/api/r02-stock-concurrency.spec.ts`                            |
| R03          | Hecho: timeouts, breaker, 6 responsabilidades, modo degradado (ADR 005). Falta conectar carrito/checkout/caché (Fases 2–4)                   | `tests/api/r03-redis.spec.ts`, `docs/redis-keys.md`                  |
| Seed         | Hecho: 13 categorías, 300 productos, 4856 SKUs (748 sin stock), 3 discontinuados, 2 redirects, 54 imágenes; idempotente                      | `pnpm db:seed` (2.ª corrida: 0 imágenes nuevas, índice `updated`)    |
| R18 contrato | ADR 004                                                                                                                                      | —                                                                    |

Deuda que pasa a la Fase 2: el cache handler legado (4 warnings de ESLint) se reemplaza por la caché multinivel.

## Fase 2 — Caché, multi-instancia y observabilidad

Estado: **cerrada con un pendiente explícito** (el test de matar una instancia "a mitad del checkout" usa el recorrido de lectura; el checkout llega en la Fase 3).

| Req                   | Estado                                                                                                                                                                  | Evidencia                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| R20 perfiles y tags   | Hecho: `catalog` / `stock` / `editorial` en `next.config.ts`; convención `product:` `category:` `stock:` `locale:` `catalog` `editorial`                                | `docs/caching.md`, `packages/data/src/cache/tags.ts`                           |
| R20 L1 + L2 + pub/sub | Hecho: `apps/web/cache-handlers/nudo-handler.js` (interfaz de Next 16.4.6), `CACHE_L1_PUBSUB` para Vercel                                                               | ADR 006, `tests/multi` (miss en web-1 ⇒ hit en web-2/3)                        |
| R20 dedupe            | Hecho: `React.cache` sobre cada lectura de `apps/web/lib/catalog.ts`                                                                                                    | —                                                                              |
| R20 stampede          | Hecho: lock `SET NX PX` + espera en L2 + single-flight local                                                                                                            | 100 requests / 1 instancia y 150 / 3 instancias ⇒ 1 consulta a Atlas por clave |
| R20 Cache-Control     | Hecho para assets, imágenes fuente y route handlers; páginas en la Fase 3                                                                                               | `docs/caching.md`                                                              |
| R20 nada privado      | Hecho: carrito/checkout fuera de `'use cache'`; el endpoint interno rechaza tags fuera de convención                                                                    | `tests/api/r20-r05-cache.spec.ts`                                              |
| R04                   | Hecho: Dockerfile multi-stage (standalone), compose con 3 instancias + nginx sin Redis/Mongo propios, `x-instance-id`, `deploymentId` y clave de Server Actions comunes | ADR 007, ADR 008, `tests/multi/r04-multi-instance.spec.ts`                     |
| R04 matar instancia   | Parcial: `docker compose kill web-2` a mitad de un recorrido ⇒ todos los requests 200 en otras instancias. Falta repetirlo dentro del checkout (Fase 3)                 | `tests/multi`                                                                  |
| R05                   | Hecho: `Server-Timing` (`catalog`, `redis`, `cache` hit/miss/stale, `total`), logs JSON con instancia/ruta/locale/request id, log de tags invalidados                   | `tests/api/r20-r05-cache.spec.ts`; la PDP en DevTools llega con la Fase 3      |
| §3.4 herramienta      | Hecho: `pnpm catalog:*` + `POST/GET /api/internal/invalidate` + `/api/internal/stats` (secreto en tiempo constante, rate limit, noindex)                                | ADR 017                                                                        |

Notas:

- El cuerpo de `'use cache'` corre fuera del `AsyncLocalStorage` del request: en un miss el tiempo de Mongo se ve dentro de `catalog;dur`, y las consultas en `/api/internal/stats` (ADR 006).
- `pnpm env:secrets` agregó a `.env.local` `INTERNAL_API_SECRET` y `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (sin sobrescribir).
- Vercel: `docs/deploy-vercel.md`. Los nombres de variables que inyecta Vercel al provisionar Redis quedan por verificar.
- Multi-instancia: `NEXT_DEPLOYMENT_ID=… docker compose up --build -d` y `MULTI_BASE_URL=http://localhost:8080 pnpm test:multi`.
