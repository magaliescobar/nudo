# ADR 008 · Caché de optimización de imágenes

- Estado: aceptado (Fase 2)
- Requerimientos: R04 (decidir caché de imágenes), R20 (Cache-Control coherente)

## Contexto

`next/image` optimiza on-demand y guarda el resultado en `.next/cache/images` **de cada instancia**. Con 3 instancias y round-robin, la misma imagen se optimizaría hasta 3 veces (CPU con `sharp`) y cada instancia guardaría su copia. Las opciones de R04: por instancia, volumen compartido o CDN.

## Decisión

**Caché compartida en la entrada de tráfico (patrón CDN)**, con la caché por instancia como segundo nivel:

- nginx cachea `/_next/image` en `proxy_cache` (`nudo_assets`, volumen `nginx-cache`, 1 GB, 7 días) con clave `URI + Accept` (el formato AVIF/WebP depende de `Accept`), `proxy_cache_lock on` (una sola optimización concurrente por variante) y `proxy_cache_use_stale` si una instancia cae.
- `/_next/static` también se cachea en nginx: son assets con hash idénticos en todas las instancias (misma build).
- Las imágenes fuente del seed (`/catalog/*`, nombre determinista no hasheado) salen con `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` (`next.config.ts`).
- En Vercel la CDN propia cumple este rol; no hace falta configuración extra.

## Alternativas descartadas

- **Solo por instancia:** trabajo triplicado y primeras respuestas lentas en cada instancia tras un deploy.
- **Volumen compartido para `.next/cache/images`:** escrituras concurrentes de varias instancias sobre el mismo directorio sin coordinación, y acopla el filesystem entre contenedores.

## Consecuencias

- Se ve en el header `X-Cache: MISS|HIT` de nginx.
- Invalidar una imagen requiere cambiar su URL (las del seed son por variante) o purgar el volumen `nginx-cache`.
