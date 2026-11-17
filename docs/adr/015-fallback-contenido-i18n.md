# ADR 015 · Fallback de contenido i18n

## Contexto

R25 pide documentar qué pasa si falta una traducción de contenido. R26 pide que agregar un idioma (p. ej. `pt`) toque solo la config de locales, un diccionario y datos de contenido, y admite traducciones parciales con fallback. Hay dos tipos de textos:

- **UI** (diccionarios en `packages/i18n/src/dictionaries/*.ts`): los controla el código.
- **Catálogo** (nombre, descripción, slug de producto y categoría en Atlas): los controla la carga de datos y pueden llegar incompletos.

## Decisión

1. **Config única.** `localeConfig` en `packages/i18n/src/config.ts` define los idiomas, su `dir` y el tag de `Intl`. `Locale` y `Localized<T>` se derivan de ahí; rutas, `generateStaticParams`, proxy, selector, sitemap, hreflang, `llms.txt` y JSON-LD iteran `locales`.
2. **UI: sin fallback en runtime.** Cada diccionario se declara `satisfies Dictionary` (forma de `es`): una clave faltante o sobrante es error de compilación. Un idioma parcial completa explícitamente desde `es` (`{ ...es, nav: { … } } satisfies Dictionary`), así la decisión queda visible en el código y no en un `??` escondido.
3. **Catálogo: fallback al idioma por defecto.** En Atlas el contenido se guarda como `StoredLocalized<T>`: `es` obligatorio, el resto opcional. `resolveLocalized()` (`packages/i18n/src/content.ts`) devuelve el valor del idioma pedido o, si falta, el de `es`, junto con el idioma real (`lang`) y `isFallback`.
4. **Efectos del fallback:**
   - La UI envuelve el texto en un elemento con `lang` del idioma real (lectores de pantalla pronuncian bien).
   - Slug faltante → se usa el slug de `es` bajo el prefijo del idioma pedido (`/pt/…/slug-es`); la URL sigue siendo estable.
   - La página en fallback tiene canonical al idioma por defecto y se excluye de sitemap/hreflang para ese idioma, para no indexar contenido duplicado.
5. **Negociación** (R24): cookie `NUDO_LOCALE` → `Accept-Language` (con `q`, coincidencia exacta o por idioma base: `es-UY` → `es`) → `es`. Nunca por IP. Redirección 307 con `Vary: Cookie, Accept-Language`.

## Alternativas

- **Fallback de UI en runtime (`t(key) ?? es[key]`)**: oculta claves faltantes hasta producción. Rechazada.
- **Devolver 404 si falta la traducción del producto**: rompe el catálogo al habilitar un idioma nuevo. Rechazada.
- **Indexar páginas en fallback**: contenido duplicado entre idiomas. Rechazada.
- **Librería de i18n (next-intl, i18next)**: el alcance se cubre con `Intl` nativo y ~100 líneas; evita una dependencia de cliente.

## Consecuencias

- Habilitar `pt` sin traducir el catálogo funciona desde el primer deploy, con SEO conservador.
- La tienda puede mostrar páginas con mezcla de idiomas mientras dure la traducción; queda marcada con `lang`.
- Verificación: `tests/api/r24-r26-i18n.spec.ts` (negociación, `lang`/`dir`, plurales, `Intl`, ninguna página nombra idiomas).
