# ADR 017 · Herramienta interna de invalidación (sin backoffice)

- Estado: aceptado (Fase 2)
- Requerimientos: §3.4, R04, R05, R20, R38

## Contexto

Sin R18 no hay backoffice ni usuarios, pero hay que poder mutar precio, stock, nombre, estado y slug y demostrar que se invalida exactamente lo debido en todas las instancias.

## Decisión

1. **Scripts CLI** (`packages/data/scripts/catalog.ts`, corridos con `tsx` y `.env.local`):
   `pnpm catalog:set-price | catalog:set-stock | catalog:rename | catalog:set-status | catalog:set-slug | catalog:invalidate`.
   Mutan Mongo vía `createCatalogAdminRepository` y después invalidan los tags de `tagsForMutation` (`packages/data/src/cache/tags.ts`):

   | Mutación | Tags                                        | Además                                                     |
   | -------- | ------------------------------------------- | ---------------------------------------------------------- |
   | precio   | `product:{id}`, `category:{id}…`            | El carrito revalida líneas en servidor (Fase 3/4)          |
   | stock    | solo `stock:{sku}`                          | Recalcula `search.inStock`; no toca descripción ni galería |
   | nombre   | `product:{id}`, `category:{id}…`            | —                                                          |
   | estado   | `product:{id}`, `category:{id}…`, `catalog` | `catalog` cubre sitemap/llms.txt y búsqueda                |
   | slug     | `product:{id}`, `category:{id}…`, `catalog` | Crea `Redirect` 301 desde el slug anterior, sin cadenas    |

2. **Route Handler interno** `POST /api/internal/invalidate` (`{ "tags": [...] }`) y `GET` (log de invalidaciones):
   - Rate limit `internal` (120/min por IP) **antes** de comparar el secreto, fail-closed si Redis cae.
   - `INTERNAL_API_SECRET` (≥ 32 caracteres) como `Bearer`, comparado con `timingSafeEqual` sobre SHA-256 de ambos (no filtra longitud).
   - Solo acepta tags de la convención documentada (rechaza `cart:*` y cualquier otro).
   - `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`. Se bloqueará también en `robots.txt` cuando exista (Fase 5).
   - Invalida con `revalidateTag(tag, { expire: 0 })` (expiración inmediata; `updateTag` solo existe en Server Actions).
3. `GET /api/internal/stats`: contadores de la instancia (consultas a Mongo, hit/miss del handler), misma guardia. Lo usan los tests de stampede.

## Consecuencias

- Si la invalidación falla después de mutar, el script sale con error y el comando exacto para reintentar (`catalog:invalidate …`); el peor caso es esperar el `expire` del perfil.
- La autorización por secreto es el equivalente a "una acción de admin sin sesión falla" (R38): `tests/api/r20-r05-cache.spec.ts` lo prueba (401 sin secreto, 400 con tags fuera de convención).
