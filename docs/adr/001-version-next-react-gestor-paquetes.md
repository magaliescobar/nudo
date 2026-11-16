# ADR 001 · Versión de Next.js/React, gestor de paquetes y bundler

- **Estado:** aceptado
- **Fecha:** 2026-11-13
- **Requerimientos:** R01, R34 · Instrucciones §0.1, §3.1 y §3.8

## Contexto

La letra exige Next.js 16.4.x con App Router y `cacheComponents`, TypeScript estricto y Turbopack como bundler. El repo ya traía una app de `create-next-app` con versiones instaladas y un lockfile de pnpm. Las instrucciones prohíben cambiar de versión mayor de Next sin consultar.

Versiones verificadas en el repo al empezar (`node_modules/next/package.json`, `pnpm-lock.yaml`):

| Pieza      | Versión               | Fuente                                   |
| ---------- | --------------------- | ---------------------------------------- |
| Next.js    | 16.4.6                | `apps/web/package.json` (exacta)         |
| React/DOM  | 19.3.0                | `apps/web/package.json` (exacta)         |
| TypeScript | 5.x, `strict: true`   | `@nudo/config/tsconfig/base.json`        |
| pnpm       | 10.17.1               | `package.json#packageManager` (Corepack) |
| Node.js    | ≥ 22.12 (local 22.17) | `package.json#engines`                   |

## Decisión

1. **Se conserva Next 16.4.6 y React 19.3.0, fijados sin rango** (`"16.4.6"`, no `^16`). Ya cumplen 16.4.x; fijarlas evita que un `pnpm install` cambie el comportamiento de caché entre instancias o entre CI y local. `eslint-config-next` se fija a la misma versión.
2. **pnpm 10 con workspaces** (ver ADR 003). Es el gestor que ya usaba el repo; aplica el aislamiento estricto de `node_modules`, lo que hace visibles las dependencias no declaradas entre paquetes (refuerza R01). `packageManager` fija la versión para Corepack.
3. **Node ≥ 22.12**: se usa `process.loadEnvFile` en `next.config.ts` e `import.meta.dirname` en scripts, y Next 16 ya exige Node 20.9 o superior.
4. **Turbopack en dev y build**, que es el bundler por defecto de Next 16 (`next dev` y `next build` muestran `(Turbopack)`). No hay `webpack()` en `next.config.ts` ni flags `--webpack`. Lo que no funcione bajo Turbopack se resuelve con una alternativa compatible documentada en un ADR, sin cambiar de bundler.
5. **Playwright Test como único framework de pruebas** (UI, API, a11y y fronteras), con proyectos `chromium`, `mobile`, `no-js` y `api` (§3.6).

## Consecuencias

- Las actualizaciones de Next/React son explícitas: se cambia la versión exacta en `apps/web/package.json`, se revisa `node_modules/next/dist/docs/` y se registra en un ADR.
- La documentación de referencia para las APIs de Next es la incluida en la versión instalada (`node_modules/next/dist/docs/`), no la memoria del agente ni la web de otra versión.
- Contribuir requiere Corepack o pnpm 10; npm/yarn no respetan el lockfile.

## Alternativas descartadas

- **Actualizar a la última versión o a un canary de Next:** fuera de alcance y riesgo de romper `cacheComponents`/`cacheHandlers` sin consulta previa.
- **npm o Yarn:** cambiar de gestor rompería el lockfile existente sin beneficio; pnpm workspaces cubre el monorepo.
- **Webpack:** prohibido por las instrucciones (§3.8).
