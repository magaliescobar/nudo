# ADR 024 · i18n propia: diccionarios tipados + Intl, sin librería

- Estado: aceptado (Fase 1, confirmado en Fase 3)
- Requerimientos: R24, R25; entregables § i18n

## Contexto

Hay que servir ES/EN con URLs `/{locale}/…`, fallback de contenido y textos de UI localizados, decidiendo entre una librería (next-intl, react-i18next, …) o una solución propia.

## Decisión

**Solución propia en `packages/i18n`**, sin dependencia externa:

- Diccionarios tipados por locale (`es`, `en`) con una clave única por texto; TypeScript exige paridad de claves entre locales en compilación.
- `Intl.NumberFormat`/`Intl.DateTimeFormat`/`Intl.PluralRules` del runtime para moneda, fechas y plurales — nada de librerías de formato.
- Routing por segmento `[locale]` con `generateStaticParams`; negociación de idioma en `proxy.ts` por cookie → `Accept-Language` → default (`es`). **No** se usa IP para elegir idioma.
- Selector de idioma como links GET a la misma ruta en el otro locale (funciona sin JS y es cacheable).
- Fallback de contenido: si un producto/categoría no tiene traducción, cae al otro locale y luego al slug/default (ADR 015).

## Consecuencias

- Cero dependencias de i18n en el bundle; el costo es mantener paridad de claves (cubierta por typecheck).
- No hay ICU MessageFormat completo: los textos compuestos se arman con helpers (`plural()`, interpolación tipada). Suficiente para el catálogo del lab.
- Una librería con ICU plural/género queda como upgrade si el contenido lo requiere.
