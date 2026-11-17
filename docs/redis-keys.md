# Redis: claves, TTLs y serialización

Fuente: `packages/data/src/redis/keys.ts`. Todas las claves llevan el prefijo `nudo:`; las del cache handler de `'use cache'` además el entorno (`nudo:{env}:`) y las entradas el `deploymentId` (ADR 006). Serialización: JSON (`JSON.stringify`), salvo contadores de rate limit (enteros nativos) y el token de lock (string).

| Responsabilidad         | Clave                                 | TTL                                  | Por qué                                                                                                                                                  |
| ----------------------- | ------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · Carrito de invitado | `nudo:cart:{cartId}`                  | 7 días, se renueva en cada escritura | Sin cuentas (ADR 004): el carrito vive mientras el invitado vuelva en la semana. Guarda solo `sku` + `qty`; precio y stock se leen siempre del servidor. |
| 2 · Sesión de checkout  | `nudo:checkout:{cartId}`              | 1 h                                  | Un checkout abandonado no debe retener datos de contacto. Al confirmar se revalida todo.                                                                 |
| 3 · Caché L2 compartida | `nudo:cache:{key}`                    | 15 min por defecto                   | Solo datos públicos de catálogo. Se invalida por tag antes del TTL; el TTL acota el daño de una invalidación perdida.                                    |
| 4 · Rate limit          | `nudo:rl:{bucket}:{subject}:{window}` | duración de la ventana               | Ventana fija con `INCR` + `EXPIRE` en `MULTI`. `search`: 30 / 10 s. `orderConfirm`: 5 / 60 s. `internal`: 120 / 60 s (fail-closed).                      |
| 5 · Invalidación L1     | canal `nudo:invalidate`               | —                                    | Pub/sub con los tags invalidados; cada instancia limpia su caché en memoria.                                                                             |
| 6a · Lock de pedido     | `nudo:lock:order:{idempotencyKey}`    | 30 s                                 | `SET NX EX` con token aleatorio; se libera con un script Lua que compara el token (no borra el lock de otro). El TTL cubre el pago simulado más lento.   |
| 6b · Idempotencia       | `nudo:idem:order:{idempotencyKey}`    | 24 h                                 | Resultado del pedido confirmado: un reintento devuelve el mismo pedido. Mongo tiene además el índice único `Order.idempotencyKey` como red final.        |

## Cache handler de `'use cache'` (Fase 2)

| Clave                                          | TTL                       | Contenido                                                                    |
| ---------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `nudo:{env}:{deploymentId}:uc:{cacheKey}`      | `expire` del perfil ≤ 7 d | JSON: valor en base64 + `tags`, `stale`, `timestamp`, `revalidate`, `expire` |
| `nudo:{env}:{deploymentId}:uc-lock:{cacheKey}` | 10 s                      | Token del lock anti-stampede (`SET NX PX`, liberado con Lua)                 |
| `nudo:{env}:tags` (hash)                       | sin TTL                   | `tag → { stale?, expired? }` en ms                                           |
| `nudo:{env}:tag-log` (lista, 200)              | sin TTL                   | `{ tag, kind, at, instance }` por invalidación (R05)                         |
| canal `nudo:{env}:invalidate`                  | —                         | Estados de tags nuevos para las L1 de las otras instancias                   |

`nudo:cache:{key}` (responsabilidad 3) queda para cachés de datos fuera de `'use cache'`; hoy no se usa.

## Timeouts y modo degradado

- Conexión: `connectTimeout` 1 s, reconexión con backoff hasta 5 s, `disableOfflineQueue` (sin conexión los comandos fallan ya).
- Por operación: 300 ms (driver + `Promise.race` en la capa).
- Circuit breaker: 3 fallos seguidos lo abren 5 s; después deja pasar una prueba.
- Con Redis caído cada operación devuelve `{ ok: false, reason: "unavailable" }` en lugar de lanzar:
  - Home, PLP y PDP no dependen de Redis para responder (la caché L2 se saltea).
  - Carrito y checkout muestran un error amable.
  - Rate limit: `search` deja pasar (fail-open); `orderConfirm` rechaza (fail-closed), porque sin lock no se puede garantizar idempotencia.
- Verificación: `tests/api/r03-redis.spec.ts`.
