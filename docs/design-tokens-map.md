# Mapa de tokens: catálogo → proyecto

Fuente: `docs/templates/catalogo-componentes-nudo.html` (bloques `:root` y `@layer themes`).
Destino: `packages/tokens/src/tokens.ts` → `pnpm --filter @nudo/tokens build` → `packages/tokens/css/tokens.css` y `packages/tokens/scss/_generated.scss`.

## Regla general

**Todo token del catálogo conserva su nombre y valor exactos.** En la fuente TS los primitivos se escriben sin el prefijo (`ink-950`) y el build les agrega `--p-` (`--p-ink-950`). Los semánticos (`--color-*`, `--text-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--motion-*`, `--ease-*`, `--layer-*`, `--font-*`) y los de componente (`--button-*`, `--input-*`, `--swatch-*`, `--card-*`, `--badge-*`, `--drawer-*`, `--header-height`) se emiten con el mismo nombre que en el catálogo.

| Familia (catálogo)                | Tokens                              | Proyecto                                                         |
| --------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| `--p-ink-*`                       | 950, 900, 800, 700, 500, 300, 100   | igual                                                            |
| `--p-concrete-*`                  | 0, 50, 100, 200, 300                | igual                                                            |
| `--p-cobalt-*`                    | 700, 600, 500, 300, 100             | igual                                                            |
| `--p-coral-*`                     | 600, 500, 200, 100                  | igual                                                            |
| `--p-green/amber/red-*`           | 600, 100                            | igual                                                            |
| `--p-font-sans` / `--p-font-mono` | Archivo + system / mono del sistema | igual; `font-sans` antepone `var(--font-archivo)` de `next/font` |
| `--p-size-*`                      | 12, 14, 16, 18, 22, 28, 36, 56, 88  | igual                                                            |
| `--p-space-*`                     | 1, 2, 3, 4, 5, 6, 8, 10, 12, 16     | igual (+ `space-0`)                                              |
| `--p-radius-*`                    | 0, 2, 6, 12, full                   | igual                                                            |
| `--p-shadow-*`                    | 1, 2, 3                             | igual                                                            |
| `--p-duration-*`                  | 75, 150, 250, 400                   | igual (+ `0` y `1400`, ver abajo)                                |
| `--p-ease-*`                      | out, in-out, snap                   | igual                                                            |
| `--p-z-*`                         | base, sticky, drawer, toast         | igual                                                            |
| Semánticos y de componente        | todos los de `:root`                | igual nombre y misma referencia                                  |

## Excepciones: literales del catálogo promovidos a primitivos

El catálogo usa hex o medidas literales en niveles 2–3. R06 exige que cada nivel solo referencie al anterior, así que esos valores se promovieron a primitivos nuevos (mismo valor) y el token original los referencia.

| Catálogo                               | Valor                 | Primitivo nuevo                      | Referenciado por                   |
| -------------------------------------- | --------------------- | ------------------------------------ | ---------------------------------- |
| dark `--color-surface-sunken`          | `#0A0F25`             | `--p-ink-1000`                       | `color-surface-sunken` (dark)      |
| dark `--color-product-stage`           | `#1B2445`             | `--p-ink-850`                        | `color-product-stage` (dark)       |
| dark `--color-accent-subtle`           | `#1D2A6B`             | `--p-cobalt-900`                     | `color-accent-subtle` (dark)       |
| dark `--color-sale-subtle`             | `#4A1F33`             | `--p-coral-900`                      | `color-sale-subtle` (dark)         |
| dark `--color-success` / `-subtle`     | `#7FD8A8` / `#143A2A` | `--p-green-300` / `--p-green-900`    | idem (dark)                        |
| dark `--color-warning` / `-subtle`     | `#F5C76A` / `#3D2E0D` | `--p-amber-300` / `--p-amber-900`    | idem (dark)                        |
| dark `--color-danger` / `-subtle`      | `#FF9C93` / `#45201D` | `--p-red-300` / `--p-red-900`        | idem (dark)                        |
| drop `--color-bg`                      | `#FFD9E1`             | `--p-coral-150`                      | `color-bg` (drop)                  |
| drop `--color-product-stage`           | `#FFC9D4`             | `--p-coral-175`                      | `color-product-stage` (drop)       |
| drop `--color-border`                  | `#F2A6B6`             | `--p-coral-300`                      | `color-border` (drop)              |
| drop `--color-accent-hover`            | `#C22546`             | `--p-coral-700`                      | `color-accent-hover` (drop)        |
| `--button-height-md`, `--input-height` | `2.75rem`             | `--p-dim-44` → `--size-control-md`   | `button-height-md`, `input-height` |
| `--button-height-sm`                   | `2.25rem`             | `--p-dim-36` → `--size-control-sm`   | `button-height-sm`                 |
| `--swatch-size`                        | `1.75rem`             | `--p-dim-28` → `--size-swatch`       | `swatch-size`                      |
| `--header-height`                      | `4rem`                | `--p-dim-64` → `--size-header`       | `header-height`                    |
| `--drawer-width`                       | `24rem`               | `--p-dim-384` → `--size-drawer`      | `drawer-width`                     |
| `--card-media-ratio`                   | `4 / 5`               | `--p-ratio-4-5` → `--ratio-product`  | `card-media-ratio`                 |
| base `line-height: 1.5`                | `1.5`                 | `--p-leading-150` → `--leading-body` | `body`                             |
| base `outline: 2px`                    | `2px`                 | `--p-border-2` → `--border-thick`    | `focus-ring`                       |
| reduced-motion `0.01ms`                | `0.01ms`              | `--p-duration-0` → `--motion-none`   | globals                            |

En `drop`, el catálogo pone `--button-radius` e `--input-radius` en `--p-radius-0`. En el proyecto se reasignan `radius-control` y `radius-card` a `radius-0`; los tokens de componente heredan el cambio, con el mismo resultado visual. `--badge-new-bg` (`ink-950`) y `--badge-new-fg` (`coral-100`) en drop apuntan a los semánticos `color-text-primary` y `color-accent-subtle`, que en ese tema valen eso mismo.

## Tokens agregados (no están en el catálogo)

| Token                                               | Valor                | Motivo                                         |
| --------------------------------------------------- | -------------------- | ---------------------------------------------- |
| `--p-weight-400…800` → `--weight-*`                 | 400–800              | El catálogo usa pesos literales en componentes |
| `--p-leading-110/130` → `--leading-tight/snug`      | 1.1 / 1.3            | Títulos y textos compactos                     |
| `--p-tracking-*` → `--tracking-display/normal/caps` | -0.02em / 0 / 0.06em | Display y etiquetas en mayúsculas              |
| `--p-border-1` → `--border-thin`                    | 1px                  | Bordes de controles y tarjetas                 |
| `--p-dim-1280` → `--size-container`                 | 80rem                | Ancho máximo de página                         |
| `--p-duration-1400` → `--motion-loop`               | 1400ms               | Ciclo del shimmer de skeleton                  |
| `--space-none`, `--radius-none`, `--layer-base`     | 0                    | Completan las escalas                          |
| Breakpoints `sm/md/lg` (solo Sass)                  | 40/60/80rem          | ADR 002 §5                                     |

## Temas

`light` es el default de `:root`. `[data-theme="dark"]` y `[data-theme="drop"]` reasignan semánticos. `[data-theme="auto"]` aplica los valores de `dark` dentro de `@media (prefers-color-scheme: dark)`. `tests/api/r06-r07-tokens-scss.spec.ts` verifica que ningún tema redefine primitivos.
