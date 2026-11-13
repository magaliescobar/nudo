# ADR 002 · Atomic Design sin catálogo y fuentes de diseño

- **Estado:** aceptado
- **Fecha:** 2026-11-13
- **Requerimientos:** R06, R07, R08 (parcial, por exclusión), R36 · Instrucciones §3.5

## Contexto

La letra pide Atomic Design con variantes y estados por componente, pero el usuario excluyó Storybook y cualquier catálogo navegable (R08). En `docs/templates/` hay dos HTML de referencia, solo de lectura y fuera de la app:

- `catalogo-componentes-nudo.html`: tokens en 3 niveles, temas y 33 componentes por nivel atómico con variantes y estados.
- `Nudo Commerce 3.html`: prototipo navegable empaquetado (bundle React con assets en base64/gzip). Para leerlo se extrajo el bundle a un directorio temporal fuera del repo; no se copió nada al proyecto.

## Decisión

### 1. Precedencia entre los dos HTML (confirmada por el usuario)

- **Catálogo = tokens y diseño**: paleta, tipografía, espaciado, radios, sombras, movimiento, z-index, temas y aspecto de cada componente.
- **Prototipo = flujo y comportamiento**: recorrido Home → PLP → PDP → carrito → checkout → confirmación, interacciones, toasts, orden de pasos y estados de pago.
- No se mezclan las paletas. Lo que ninguno define se infiere de forma coherente con el catálogo y la letra, y se registra en la sección 5.

### 2. Diferencias entre los dos HTML

| Aspecto              | Catálogo (fuente de diseño)                                                 | Prototipo (solo flujo)                                                          | Se usa                          |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------- |
| Neutros              | `ink` 950–100 (`#0E1430`…`#E2E4EC`), `concrete` 0–300 (`#FFFFFF`…`#C9CDC5`) | Cálidos: `#F3F1EC`, `#FAF9F6`, `#E6E2D9`, `#DDD8CD`, `#151515`, `#6B6860`       | Catálogo                        |
| Acento               | `cobalt` (`#3550FF`) y `coral` (`#FF4F6E`)                                  | Naranja `#FF5A1F`                                                               | Catálogo                        |
| Estados              | `green`, `amber`, `red` 600/100                                             | Rojo `#B3261E`                                                                  | Catálogo                        |
| Tipografía           | Archivo (variable, `wdth` 62–125, `wght` 100–900) + mono del sistema        | Geist, Geist Mono, Bricolage Grotesque                                          | Catálogo (Archivo, `next/font`) |
| Escala tipográfica   | 12, 14, 16, 18, 22, 28, 36, 56, 88 px                                       | Valores sueltos                                                                 | Catálogo                        |
| Radios               | 0, 2, 6, 12, full; semánticos `control`/`card`/`panel`/`pill`               | 6, 12, 18 px, 999 px y formas orgánicas                                         | Catálogo                        |
| Sombras / movimiento | `shadow-1..3`; 75/150/250/400 ms; `out`, `in-out`, `snap`                   | Ad hoc                                                                          | Catálogo                        |
| Temas                | `light`, `dark`, `drop` (campaña, radios 0) y `auto`                        | Un solo tema claro                                                              | Catálogo                        |
| Componentes          | 12 átomos, 10 moléculas, 11 organismos con variantes/estados                | Pantallas completas sin separación atómica                                      | Catálogo                        |
| Pantallas y rutas    | No define rutas                                                             | `home`, `plp`, `pdp`, `cart`, `checkout`, `confirm`                             | Prototipo + letra               |
| Interacciones        | Estados visuales por componente                                             | Agregar al carrito con toast, mini-carrito, pasos de checkout, pago con timeout | Prototipo + letra               |
| Idioma               | ES/EN en los textos de ejemplo                                              | ES                                                                              | Letra (ES/EN, R24)              |

### 3. Tokens

- Fuente única en `packages/tokens` (TS/JSON) que genera CSS custom properties y la API Sass `@use 'tokens'` (`token()`, `breakpoint()`, `motion()`); se implementa en la Fase 1 (R06).
- Se conservan los 3 niveles y los nombres del catálogo: primitivos `--p-*` → semánticos (`--color-*`, `--text-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--motion-*`, `--ease-*`, `--layer-*`) → de componente (`--button-*`, `--input-*`, `--swatch-*`, `--card-*`, `--badge-*`…). Cada nivel solo referencia al anterior.
- Los temas `dark` y `drop` reasignan **solo semánticos** (y tokens de componente que el catálogo reasigna, como `--button-radius` en `drop`). El catálogo define algunos semánticos de `drop` con hex directo (`--color-bg: #FFD9E1`, `--color-border: #F2A6B6`, `--color-accent-hover: #C22546`, `--color-product-stage: #FFC9D4`); en el proyecto se promueven a primitivos `coral` para cumplir la regla de niveles.
- El mapa completo token del template → token del proyecto va en `docs/design-tokens-map.md` (Fase 1).

### 4. Atomic Design sin catálogo

- Estructura en `packages/ui/src/{atoms,molecules,organisms}/<Componente>/<Componente>.tsx` + `<Componente>.module.scss`, un export por subpath (`@nudo/ui/atoms/Button`), sin barrel raíz.
- Reglas de composición (verificadas por ESLint, ver `eslint.config.mjs` y `tests/api/r01-boundaries.spec.ts`): un átomo no importa moléculas ni organismos; una molécula no importa organismos; `ui` no conoce `@nudo/data`, MongoDB ni Redis.
- Inventario: el del catálogo y la letra (Átomos: Button, Link, Icon, Price, Badge, Swatch, Input, Checkbox, Radio, Skeleton, VisuallyHidden, Spinner · Moléculas: SwatchGroup, SizeSelector, QuantityStepper, FacetOption, PriceRange, Breadcrumbs, FormField, Pagination, LocaleSwitcher, StepIndicator · Organismos: ProductCard, ProductGrid, FacetPanel, ProductGallery, VariantSelector, CartLine, MiniCart, CheckoutStep, OrderSummary, Header, Footer).
- Cada componente es Server Component salvo que necesite interactividad; el motivo va en un comentario de cabecera.
- **Evidencia de variantes y estados:** tests de Playwright sobre una ruta interna de fixtures (`/[locale]/__fixtures/ui`). La ruta responde 404 salvo con `NUDO_UI_FIXTURES=1`, que se activa solo en el `webServer` de Playwright; lleva `noindex` y queda fuera del sitemap. Se elige sobre recorrer solo pantallas reales porque hay estados (error, agotado, loading, vacío) difíciles de forzar de forma determinista en la app. Cada test cubre los tres temas, ES/EN y axe; los skeletons se comparan dimensionalmente con el componente real.

### 5. Inferencias (no definidas por ningún HTML)

- **Breakpoints:** el catálogo solo usa container queries (22, 26, 28, 30, 34, 40, 52 y 60 rem). Para media queries se definen `sm 40rem`, `md 60rem` y `lg 80rem`, alineados con los cortes de la grilla de productos del catálogo (3 columnas a 40 rem, 4 a 60 rem).
- **Copy:** el del prototipo en ES como base y su traducción en EN; los textos nuevos siguen el mismo tono.

## Consecuencias

- No hay catálogo ni Storybook en la app; la evidencia de cada componente son sus tests.
- Los HTML de `docs/templates/` no se importan, no se sirven y no se copian a `public/`.
- Un componente no está terminado hasta tener sus variantes, estados y tests.

## Alternativas descartadas

- **Storybook o página de catálogo:** excluido por el usuario (R08).
- **Usar la estética del prototipo:** descartado por la precedencia confirmada.
- **Probar estados solo en pantallas reales:** no es determinista para error, timeout o agotado.
