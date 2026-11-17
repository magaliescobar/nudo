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
