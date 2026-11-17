# ADR 005 · Cliente Redis, timeouts y modo degradado

## Contexto

R03 usa Redis para carrito, checkout, caché L2, rate limit, invalidación L1 y lock/idempotencia, y exige timeouts explícitos y un comportamiento definido con Redis caído. Un cliente sin límites convierte "Redis lento" en "toda la tienda lenta".

## Decisión

- **Cliente:** `redis` (node-redis) 6.3.1, el que ya usaba el proyecto. TCP estándar, funciona con el contenedor local y con Redis gestionados.
- **Timeouts:** conexión 1 s; 300 ms por comando (opción del driver + `Promise.race` en `packages/data/src/redis/store.ts`); `disableOfflineQueue` para que, sin conexión, los comandos fallen al instante.
- **Circuit breaker** (`redis/breaker.ts`): 3 fallos seguidos lo abren 5 s; luego una prueba half-open.
- **Resultados explícitos:** cada operación devuelve `RedisResult<T>` (`{ ok: true, value }` o `{ ok: false, reason: "unavailable" }`) en vez de lanzar. Quien llama decide la degradación.
- **Degradación por responsabilidad:**
  - Catálogo (Home/PLP/PDP): saltea la L2 y lee de Atlas.
  - Carrito y checkout: mensaje amable, nunca 500.
  - Rate limit `search`: fail-open. `orderConfirm`: fail-closed (sin lock no hay garantía de idempotencia).
  - Pedido: además del lock en Redis, el índice único `Order.idempotencyKey` impide duplicados.
- **Singleton** por instancia en `packages/data/src/redis.ts` (`server-only`); en dev vive en `globalThis` para sobrevivir al HMR. Logs de degradación limitados a uno cada 10 s.
- Claves, TTLs y serialización: `docs/redis-keys.md`.

## Alternativas

- **ioredis**: API similar, pero suma una dependencia sin ganancia; node-redis 6 ya tiene timeout por comando.
- **Upstash REST**: útil en serverless; se deja como driver alternativo (`REDIS_DRIVER` en `.env.example`) si el despliegue lo requiere.
- **Lanzar excepciones y capturarlas en cada página**: fácil de olvidar en un call site; un 500 por Redis viola R03.

## Consecuencias

- Con Redis caído la tienda navega; solo carrito/checkout quedan inhabilitados.
- Verificación: `tests/api/r03-redis.spec.ts` (Redis caído responde `unavailable` en < 500 ms, breaker, lock exclusivo, TTL de carrito, rate limit).
