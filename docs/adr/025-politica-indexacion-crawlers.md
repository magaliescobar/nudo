# ADR 025 — Política de indexación, facetas, crawlers IA y productos discontinuados

## Contexto

R28 y R32 piden decisiones explícitas sobre qué URLs entran al índice, cómo se
trata a los crawlers de entrenamiento de IA y qué pasa con productos que dejan
de venderse. `robots.txt` controla _rastreo_ (crawl), no _indexación_: una URL
bloqueada allí no expone su `noindex` ni su canonical, así que cada herramienta
aplica a una capa distinta.

## Decisión

| Zona                                               | Crawl (robots.txt)                             | Indexación (meta robots / canonical)                       | Motivo                                                                                                            |
| -------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Home `/{locale}`                                   | allow                                          | index                                                      | Landing canónica                                                                                                  |
| PDP `/{locale}/p/{slug}`                           | allow                                          | index, canonical propia                                    | Una URL por producto; `?v`/`?img` no indexan                                                                      |
| PLP categoría limpia                               | allow                                          | index, canonical propia                                    | Landing de categoría                                                                                              |
| PLP con ≤1 faceta                                  | allow                                          | index                                                      | Long-tail razonable (`?color=negro`)                                                                              |
| PLP con ≥2 facetas / precio / sort≠relevance / `q` | allow                                          | `noindex,follow` + canonical propia                        | Explosión combinatoria fuera del índice; los links internos siguen fluyendo                                       |
| PLP paginada (`?page=N`)                           | allow                                          | index si el estado base es indexable; canonical a sí misma | Cada página es contenido distinto                                                                                 |
| `?sort=`, `?view=`, `?img=` en cualquier URL       | **disallow** en robots.txt                     | canonical a la URL sin ese param                           | Parámetros de presentación, sin valor                                                                             |
| Búsqueda interna `/{locale}/search`                | allow                                          | `noindex,follow`                                           | Thin/duplicado; canonical propia                                                                                  |
| Carrito, checkout, pedido                          | **disallow** + `noindex,nofollow` en la página | —                                                          | Privado; se bloquea el crawl para ahorrar presupuesto y además van con meta robots por si entran por link externo |
| `/api/`, `/_next/`                                 | disallow                                       | —                                                          | No son documentos                                                                                                 |
| Producto `discontinued`                            | allow                                          | `noindex` + 200                                            | Los enlaces viejos no se rompen; sale del índice, del sitemap y de la PLP; su JSON-LD queda `OutOfStock`          |
| Producto `draft`                                   | —                                              | 404 real (page-guard)                                      | Nunca existió públicamente                                                                                        |
| Slug viejo                                         | —                                              | 301/308 desde la tabla `Redirect`                          | `catalog-admin` crea el redirect al renombrar slugs, sin cadenas                                                  |

### Crawlers de IA

Los bots de _entrenamiento_ (`GPTBot`, `CCBot`, `ClaudeBot`, `anthropic-ai`,
`Bytespider`, `meta-externalagent`) van con `Disallow: /`. La política se
implementa en `robots.ts`, no por IP ni por meta. A cambio, `/llms.txt` y
`/llms-full.txt` ofrecen el catálogo curado para consumo de LLMs (R31): es el
canal explícito que preferimos sobre el crawling indiscriminado. Bots de
_búsqueda_ con IA (Googlebot, Bingbot) no se tocan.

### Redirects y normalización

`proxy.ts` normaliza antes de renderizar: 301 por trailing slash, mayúsculas en
el path y query params desconocidos (solo en document requests). Los slugs
viejos los resuelve `page-guard` contra la colección `redirects` (cacheada con
tag `catalog`), devolviendo el status real del documento (301/308).

## Consecuencias

- El índice queda limitado a URLs canónicas con valor: home, categorías, PDPs y
  PLPs de una faceta.
- `noindex,follow` (no `nofollow`) en facetas mantiene el flujo de link equity
  hacia los productos.
- Un producto discontinuado no rompe bookmarks ni enlaces externos, pero deja
  de competir en el índice.
