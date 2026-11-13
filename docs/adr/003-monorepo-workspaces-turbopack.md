# ADR 003 · Monorepo con pnpm workspaces + Turbopack

- **Estado:** aceptado
- **Fecha:** 2026-11-13
- **Requerimientos:** R01, R07, R34 · Instrucciones §3.1 y §3.8

## Contexto

El proyecto nació como una app de `create-next-app` en la raíz del repo (`app/`, `public/`, `next.config.ts`, `cache-handlers/`). La letra (R01, §5.3) pide un monorepo con paquetes internos y fronteras verificadas automáticamente, y el usuario ya decidió: **monorepo con workspaces y Turbopack** como bundler (dev y build). El gestor de paquetes existente es **pnpm 10** (`packageManager` en `package.json`, `pnpm-lock.yaml`), así que se usan **pnpm workspaces**.

## Decisión

### 1. Plan de migración (qué se mueve y adónde)

La migración se hace en commits aislados con `git mv` para conservar el historial.

| Origen (raíz)                | Destino                           | Nota                                                                    |
| ---------------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| `app/`                       | `apps/web/app/`                   | Rutas del App Router                                                     |
| `public/`                    | `apps/web/public/`                | Assets estáticos                                                         |
| `cache-handlers/`            | `apps/web/cache-handlers/`        | Handler actual; en Fase 2 se reemplaza por el de `packages/data` (R20)  |
| `next.config.ts`             | `apps/web/next.config.ts`         | Se agrega `turbopack.root`, `transpilePackages`, `sassOptions`          |
| `tsconfig.json`              | `apps/web/tsconfig.json`          | Extiende la base de `@nudo/config`                                      |
| `package.json`               | `apps/web/package.json`           | Se renombra a `@nudo/web`; en la raíz queda un `package.json` nuevo     |
| `eslint.config.mjs`          | queda en la raíz                  | Config única para todo el monorepo (fronteras R01)                      |
| `pnpm-workspace.yaml`        | queda en la raíz                  | Se agregan `apps/*` y `packages/*`                                      |
| `.env.local`                 | **queda en la raíz** (no se toca) | Ver punto 4                                                              |
| `docs/`, `learning/`, `*.md` | quedan en la raíz                 | Documentación del repo                                                   |

Paquetes nuevos en `packages/` (todos ESM, `"type": "module"`, scope `@nudo/*`):

| Paquete          | Responsabilidad                                                            | Puede importar                            |
| ---------------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| `@nudo/config`   | Bases de `tsconfig`                                                         | —                                         |
| `@nudo/tokens`   | Fuente única de tokens → CSS custom properties + API Sass                  | —                                         |
| `@nudo/i18n`     | Config de locales, diccionarios tipados, helpers `Intl`                    | —                                         |
| `@nudo/commerce` | Dominio puro: tipos, reglas de precio/stock, casos de uso (sin React/Next) | `i18n`                                    |
| `@nudo/ui`       | Componentes Atomic Design (`atoms/`, `molecules/`, `organisms/`)           | `tokens`, `i18n`, `commerce` (solo tipos) |
| `@nudo/data`     | Repositorios Mongo + Redis, `server-only`                                  | `commerce`, `i18n`                        |
| `@nudo/web`      | App Next.js (rutas, composición, adaptadores)                              | todos                                     |

### 2. Estrategia de paquetes internos: TypeScript sin compilar + `transpilePackages`

Los paquetes exponen **TypeScript/SCSS fuente** y se declaran en `transpilePackages` de `apps/web/next.config.ts`. Cada paquete define `exports` **por subpath** apuntando a `.ts`/`.tsx` (sin barrel en la raíz del paquete), y `sideEffects` explícito:

- `@nudo/ui`: `"sideEffects": ["**/*.scss", "**/*.css"]` (si fuera `false`, el bundler podría descartar los estilos de SCSS Modules — R34).
- Resto: `"sideEffects": false`, salvo `@nudo/data`, cuyo entrypoint importa `server-only` (efecto deseado: romper el build si llega al cliente).

Alternativa descartada: compilar cada paquete a ESM (`tsc`/`tsup`) y apuntar `exports` a `dist/`. Agrega un paso de build y watchers por paquete sin beneficio para un monorepo de una sola app.

Los scripts de Node (`db:seed`, `catalog:*`) consumen los mismos paquetes con `tsx --env-file=.env.local`, sin depender de Turbopack.

### 3. Turbopack

- `turbopack.root` = raíz del monorepo (`path.join(__dirname, '../..')`). Next la detectaría sola por el `pnpm-lock.yaml`, pero se fija explícitamente para que no dependa de la heurística y para alinear con `outputFileTracingRoot` (mismo valor) cuando se use `output: 'standalone'` en las imágenes Docker de R04 (Fase 2).
- **Sass entre paquetes:** Turbopack no soporta imports con `~`. Se usa `sassOptions.loadPaths` apuntando a `packages/tokens/scss`, de modo que tanto `apps/web` como `packages/ui` escriben `@use 'tokens'`. La capa compartida solo expone funciones/mixins/variables (no emite CSS), así que importarla desde N módulos no duplica reglas (verificación en R07, Fase 1).
- Prohibido configurar webpack (`webpack()`, loaders, `--webpack`) y herramientas que dependan de él (p. ej. `@next/bundle-analyzer`).

### 4. Variables de entorno en el monorepo

`.env.local` (con `MONGODB_URI` y `REDIS_URL`) **queda en la raíz del repo** y no se mueve ni se duplica. Next solo carga `.env*` del directorio de la app (`apps/web`), así que `apps/web/next.config.ts` carga `../../.env.local` con `process.loadEnvFile` (API nativa de Node ≥ 21.7, sin agregar `dotenv`) **solo si el archivo existe**. En Vercel/Docker no existe y las variables llegan por el entorno. `process.loadEnvFile` no pisa variables ya definidas en el entorno.

## Alternativas

- **Mantener la app en la raíz y solo agregar `packages/`:** menos movimiento, pero la raíz queda mezclada (config de la app + config del workspace) y las fronteras se vuelven confusas.
- **Turborepo/Nx encima de pnpm:** útil con muchas apps; acá hay una sola app y los scripts de pnpm (`-r`, `--filter`) alcanzan.
- **Symlink `apps/web/.env.local → ../../.env.local`:** frágil (Windows, Docker) y fácil de commitear por error.

## Consecuencias

- Los comandos se corren desde la raíz (`pnpm dev`, `pnpm build`, `pnpm check`) y delegan en `@nudo/web` con `--filter`.
- Agregar un paquete = carpeta en `packages/`, `package.json` con `exports`, entrada en `transpilePackages` y reglas de frontera en `eslint.config.mjs`.
- El historial de los archivos movidos se conserva (`git log --follow apps/web/app/page.tsx`).
