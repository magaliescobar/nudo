# Redis: claves, TTLs y serialización

Fuente: `packages/data/src/redis/keys.ts`. Todas las claves llevan el prefijo `nudo:`. Serialización: JSON (`JSON.stringify`), salvo contadores de rate limit (enteros nativos) y el token de lock (string).

| Responsabilidad         | Clave                                 | TTL                                  | Por qué                                                                                                                                                  |
| ----------------------- | ------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · Carrito de invitado | `nudo:cart:{cartId}`                  | 7 días, se renueva en cada escritura | Sin cuentas (ADR 004): el carrito vive mientras el invitado vuelva en la semana. Guarda solo `sku` + `qty`; precio y stock se leen siempre del servidor. |
| 2 · Sesión de checkout  | `nudo:checkout:{cartId}`              | 1 h                                  | Un checkout abandonado no debe retener datos de contacto. Al confirmar se revalida todo.                                                                 |
| 3 · Caché L2 compartida | `nudo:cache:{key}`                    | 15 min por defecto                   | Solo datos públicos de catálogo. Se invalida por tag antes del TTL; el TTL acota el daño de una invalidación perdida.                                    |
| 4 · Rate limit          | `nudo:rl:{bucket}:{subject}:{window}` | duración de la ventana               | Ventana fija con `INCR` + `EXPIRE` en `MULTI`. `search`: 30 / 10 s. `orderConfirm`: 5 / 60 s.                                                            |
| 5 · Invalidación L1     | canal `nudo:invalidate`               | —                                    | Pub/sub con los tags invalidados; cada instancia limpia su caché en memoria.                                                                             |
| 6a · Lock de pedido     | `nudo:lock:order:{idempotencyKey}`    | 30 s                                 | `SET NX EX` con token aleatorio; se libera con un script Lua que compara el token (no borra el lock de otro). El TTL cubre el pago simulado más lento.   |
| 6b · Idempotencia       | `nudo:idem:order:{idempotencyKey}`    | 24 h                                 | Resultado del pedido confirmado: un reintento devuelve el mismo pedido. Mongo tiene además el índice único `Order.idempotencyKey` como red final.        |

## Timeouts y modo degradado

- Conexión: `connectTimeout` 1 s, reconexión con backoff hasta 5 s, `disableOfflineQueue` (sin conexión los comandos fallan ya).
- Por operación: 300 ms (driver + `Promise.race` en la capa).
- Circuit breaker: 3 fallos seguidos lo abren 5 s; después deja pasar una prueba.
- Con Redis caído cada operación devuelve `{ ok: false, reason: "unavailable" }` en lugar de lanzar:
  - Home, PLP y PDP no dependen de Redis para responder (la caché L2 se saltea).
  - Carrito y checkout muestran un error amable.
  - Rate limit: `search` deja pasar (fail-open); `orderConfirm` rechaza (fail-closed), porque sin lock no se puede garantizar idempotencia.
- Verificación: `tests/api/r03-redis.spec.ts`.
