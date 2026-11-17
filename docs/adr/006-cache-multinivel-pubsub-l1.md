# ADR 006 · Caché multinivel: L1 en memoria + L2 Redis, tags distribuidos y pub/sub (desactivable en Vercel)

- Estado: aceptado (Fase 2)
- Requerimientos: R20, R04, R05, §3.3 (cache handler remoto)

## Contexto

`'use cache'` con `cacheComponents` delega en `cacheHandlers`. El handler heredado guardaba en Redis sin prefijos, sin tags, sin timeout y revisaba `revalidate` por su cuenta. Con 3+ instancias necesitamos: entradas compartidas, invalidación que llegue a todas sin esperar TTL, una sola regeneración por clave caliente (stampede) y que una caída de Redis no rompa el render.

La interfaz se tomó de la doc instalada (`next/dist/docs/.../cacheHandlers.md`, Next 16.4.6): `get(cacheKey, softTags)`, `set(cacheKey, pendingEntry)`, `refreshTags()`, `getExpiration(tags)`, `updateTags(tags, durations?)`.

## Decisión

Un handler propio, `apps/web/cache-handlers/nudo-handler.js` (CommonJS: Next lo carga con `require.resolve` fuera del grafo de Turbopack), registrado como `default` y `remote`.

| Pieza          | Implementación                                                                                                                                                                                                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1             | `Map` LRU por proceso, tope `CACHE_L1_MAX_BYTES` (50 MB). Guarda bytes, nunca el stream; cada hit crea un `ReadableStream` nuevo.                                                                                                                                                                                |
| L2             | Redis `nudo:{env}:{deploymentId}:uc:{cacheKey}` → JSON con el valor en base64 y la metadata (`tags`, `stale`, `timestamp`, `revalidate`, `expire`). TTL = `expire` del perfil (tope 7 días).                                                                                                                     |
| Tags           | Hash `nudo:{env}:tags`: `tag → { stale?, expired? }` (ms). `updateTags` sin `durations` ⇒ `expired = now`; con `durations` ⇒ `stale = now`, `expired = now + expire`. Se evalúan tags propios y soft tags.                                                                                                       |
| Sincronización | `CACHE_L1_PUBSUB=true`: `PUBLISH nudo:{env}:invalidate` con los estados nuevos; cada instancia los aplica al recibirlos y además relee el hash cada 30 s (red de seguridad si se perdió un mensaje).                                                                                                             |
| Sin pub/sub    | `CACHE_L1_PUBSUB=false` (Vercel): `refreshTags()` relee el hash en cada request (una `HGETALL` de ≤ 300 ms). L2 + tags + `revalidateTag` son la fuente de verdad.                                                                                                                                                |
| Anti-stampede  | En un miss (o entrada expirada por tag): `SET nudo:{env}:{deploymentId}:uc-lock:{key} token NX PX 10000`. Quien lo gana regenera (con doble chequeo de L2); el resto espera la entrada en L2 (polling 50 ms, máx. 3 s). Single-flight también dentro del proceso. El lock se libera con Lua comparando el token. |
| Degradación    | Timeout 300 ms por operación, breaker (3 fallos ⇒ abierto 5 s), `disableOfflineQueue`. Sin Redis: solo L1 y cada instancia regenera por su cuenta; nunca lanza. Si el lock no se puede pedir, regenera.                                                                                                          |
| Observabilidad | Por request reporta `hit`/`miss`/`stale` a un observer en `globalThis` (lo instala `@nudo/data/observability`); eventos `cache.regenerate`/`cache.wait-timeout` como JSON con la clave hasheada.                                                                                                                 |

Perfiles de negocio en `next.config.ts` (`cacheLife`): `catalog` (stale 300 / revalidate 900 / expire 86400), `stock` (30 / 30 / 300), `editorial` (900 / 3600 / 604800). Tags: `docs/caching.md`.

Las invalidaciones de la herramienta interna (ADR 017) usan `revalidateTag(tag, { expire: 0 })`: el siguiente request ya no ve el valor viejo en ninguna instancia (equivale a `updateTag`, que solo existe en Server Actions).

## Alternativas descartadas

- **Solo L2 (sin L1):** cada hit pagaría un round-trip a Redis y un JSON de cientos de KB en PDPs calientes.
- **Solo L1 + revalidación por TTL:** viola "un cambio en la instancia 1 se ve en las 2 y 3 sin esperar TTL".
- **Borrar entradas por tag (índice tag → claves):** hay que mantener sets en Redis y borrar N claves por invalidación; los timestamps por tag cuestan O(tags) y además sirven para soft tags.
- **Lock con Redlock multi-nodo:** hay un solo Redis; el lock es una optimización (si se pierde, a lo sumo hay una regeneración extra), no una garantía de exclusión.

## Consecuencias

- Un deploy nuevo (`NEXT_DEPLOYMENT_ID` distinto) no lee entradas del anterior; los tags (por entorno) sí se comparten.
- El hash de tags crece con los tags invalidados alguna vez (≈ 1 campo por producto/SKU tocado): acotado por el catálogo.
- El cuerpo de `'use cache'` corre fuera del `AsyncLocalStorage` del request: el tiempo de Mongo de un miss se ve dentro de `catalog;dur` (Server-Timing) y en los contadores del proceso (`/api/internal/stats`), no como métrica `mongo` del request.
- En Vercel (sin pub/sub) cada request hace una `HGETALL`; con `CACHE_L1_PUBSUB=false` la L1 sigue sirviendo dentro de la vida de la función, pero siempre contrastada contra los tags recién leídos.
