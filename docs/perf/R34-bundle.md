# R34 — First Load JS: medicion, budgets y optimizaciones

## Como se mide

`scripts/bundle-budget.mjs` pide el documento de cada ruta al server en vivo
(`BASE_URL`, default `http://localhost:3100`), recolecta los
`<script src="/_next/static/chunks/*.js">` y suma su tamano **gzip** (nivel 6,
igual que el middleware de Next). Rutas `instant=false` no tienen HTML
prerenderizado — el `.next/server/app/*.html` es un shell vacio — por eso la
medicion es en vivo y no contra el filesystem.

- `node scripts/bundle-budget.mjs` → reporte, exit 1 si alguna ruta excede su budget.
- `--write-baseline [--out=file]` → guarda JSON en `docs/perf/`.
- Budgets por ruta en `scripts/bundle-budget.json` (bytes gzip).
- CI: `tests/api/phase5-bundle.spec.ts` corre la misma logica contra Playwright y falla al exceder.

## Baseline vs after (medidos el mismo dia, mismo build tool)

| ruta   | before gzip | after gzip | delta |
| ------ | ----------: | ---------: | ----: |
| home   |     190,224 |    191,782 | +1.6k |
| plp    |     190,224 |    191,782 | +1.6k |
| pdp    |     188,763 |    189,985 | +1.2k |
| search |     190,224 |    191,782 | +1.6k |
| cart   |     187,479 |    188,580 | +1.1k |
| shared |     186,957 |    182,621 | −4.3k |

`shared` = chunks presentes en el documento de **todas** las rutas (~React/Next
runtime + layout). El JS propio por ruta es chico (0.5–9k gzip).

## Optimizaciones (before/after)

### 1. Lazy `MiniCartBody` (split por interaccion)

El drawer del carrito se monta en el layout → su codigo (lineas, `next/image`,
`formatPrice`, `ButtonLink`) viajaba en el chunk compartido de **todas** las
rutas, aunque solo se usa al abrir el drawer. Se extrajo a
`MiniCartBody.tsx` cargado con `dynamic()` al abrir + `import()` de warm-up en
`onMouseEnter`/`onFocus` del trigger.

- **Efecto**: −4.3k gzip del shared, ~18k raw de evaluacion diferida al click.
- **Trade-off medido**: el boundary async duplico deps (`formatPrice`,
  componentes UI) en el chunk lazy → +1.5k gzip total por ruta. Neto en bytes
  levemente negativo; neto en trabajo de main-thread positivo (codigo que ya no
  se parsea/ejecuta en first load). Se mantiene: el drawer es por definicion
  UI no critica del primer render.

### 2. `compiler.removeConsole` en produccion

`next.config.ts`: `removeConsole: { exclude: ["error", "warn"] }` — sin
`console.*` en los bundles del browser.

### 3. `sideEffects` en `@nudo/data`

Faltaba la declaracion (`false`): ahora los 6 paquetes internos la tienen —
`commerce`/`config`/`data`/`i18n` en `false`; `tokens`/`ui` en
`["**/*.scss","**/*.css"]` (los modulos de estilos si tienen side effects).

### 4. Auditoria de boundaries y barrels (verificado, sin cambio de bytes)

- Imports de `@nudo/commerce` en componentes cliente: **solo `import type`**
  (`CartView`, `CardProduct`, `FieldErrors`) → `valibot` y los schemas no llegan
  al cliente (verificado por grep de chunks: sin `safeParse`).
- No hay barrels: todos los imports internos usan subpaths
  (`@nudo/ui/organisms/MiniCart`, `@nudo/commerce/card`), no hace falta
  `optimizePackageImports`.
- `lib/catalog.ts` y `@nudo/data` son `server-only` (import explícito).
- Iconos: `Icon` es un server component con paths SVG inline por icono — sin
  libreria de iconos, el set minimo viaja con cada uso.
- `InfiniteGrid` usa `import type` para `CardProduct` → el cliente recibe solo
  la UI, la logica de commerce queda en server.

## Falla de tree-shaking documentada

**Caso**: tras el split lazy de `MiniCartBody`, el chunk async
`0_70vt0vcez1c.js` pesaba 18k raw para ~2.4k de codigo propio — Turbopack
re-empaqueto `formatPrice`, `next/image` y atomos en el chunk async aunque ya
existian en el grafo sincronico.

**Deteccion**: diff de `bundle-baseline.json` vs `bundle-after.json` (shared
−4.3k pero total +1.5k) + grep de strings por chunk.

**Manejo**: se acepta — el boundary `dynamic()`/`import()` prioriza cacheabilidad
del chunk sobre deduplicacion perfecta; la alternativa (mantener el panel en el
first load de todas las rutas) es peor para evaluacion inicial. Si un futuro
upgrade del bundler deduplica, el split queda estrictamente mejor sin cambios.

## Budgets

| ruta   | budget | margen sobre medicion |
| ------ | -----: | --------------------: |
| home   |   195k |                 ~1.7% |
| plp    |   215k |                  ~12% |
| pdp    |   215k |                  ~13% |
| search |   215k |                  ~12% |
| cart   |   215k |                  ~14% |

Margen chico a proposito: los budgets existen para cazar regresiones, no para
permitir crecimiento. El shared (~183k gzip) es casi todo runtime React 19 +
Next 16 — el costo fijo del App Router; el espacio de optimizacion propio esta
en el JS por ruta y en diferir lo no critico.

## Reproducir

```bash
pnpm -C apps/web build && pnpm -C apps/web start -p 3100 &
node scripts/bundle-budget.mjs --write-baseline   # guarda baseline
# ... cambios ...
node scripts/bundle-budget.mjs --write-baseline --out=docs/perf/bundle-after.json
node scripts/bundle-budget.mjs                    # enforce budgets (exit 1 si excede)
```
