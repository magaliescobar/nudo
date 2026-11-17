// Capa Redis (R03): las seis responsabilidades detrás de operaciones con timeout + breaker.
// Sin `server-only` para poder probarla fuera de Next; el singleton vive en ./client.ts.
import { randomUUID } from "node:crypto";
import type { Cart, CheckoutSession } from "@nudo/commerce/catalog";
import type { createClient } from "redis";
import { CircuitBreaker } from "./breaker";
import { invalidationChannel, keys, type RateLimitBucket, rateLimits, ttlSeconds } from "./keys";

export type RedisClient = ReturnType<typeof createClient>;

export type RedisResult<T> = { ok: true; value: T } | { ok: false; reason: "unavailable" };

const unavailable = { ok: false, reason: "unavailable" } as const;

export type RedisStoreOptions = {
  /** Tope por operación. Redis lento no puede frenar el render. */
  timeoutMs?: number;
  breaker?: CircuitBreaker;
  onDegraded?: (operation: string, error: unknown) => void;
};

const releaseLockScript =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

export function createRedisStore(client: RedisClient, options: RedisStoreOptions = {}) {
  const timeoutMs = options.timeoutMs ?? 300;
  const breaker = options.breaker ?? new CircuitBreaker();

  async function run<T>(operation: string, fn: () => Promise<T>): Promise<RedisResult<T>> {
    if (!breaker.canRequest()) return unavailable;
    if (!client.isReady) {
      breaker.recordFailure();
      options.onDegraded?.(operation, new Error("Redis no conectado"));
      return unavailable;
    }
    let timer: NodeJS.Timeout | undefined;
    try {
      const value = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Redis timeout (${timeoutMs} ms)`)), timeoutMs);
        }),
      ]);
      breaker.recordSuccess();
      return { ok: true, value };
    } catch (error) {
      breaker.recordFailure();
      options.onDegraded?.(operation, error);
      return unavailable;
    } finally {
      clearTimeout(timer);
    }
  }

  const getJson = async <T>(operation: string, key: string): Promise<RedisResult<T | null>> => {
    const result = await run(operation, () => client.get(key));
    if (!result.ok) return result;
    return { ok: true, value: result.value ? (JSON.parse(result.value) as T) : null };
  };

  const setJson = (operation: string, key: string, value: unknown, ttl: number) =>
    run(operation, () =>
      client.set(key, JSON.stringify(value), { expiration: { type: "EX", value: ttl } }),
    );

  return {
    breaker,

    // 1 · Carrito de invitado
    cart: {
      get: (cartId: string) => getJson<Cart>("cart.get", keys.cart(cartId)),
      save: (cart: Cart) => setJson("cart.save", keys.cart(cart.id), cart, ttlSeconds.cart),
      delete: (cartId: string) => run("cart.delete", () => client.del(keys.cart(cartId))),
    },

    // 2 · Sesión de checkout
    checkout: {
      get: (cartId: string) => getJson<CheckoutSession>("checkout.get", keys.checkout(cartId)),
      save: (session: CheckoutSession) =>
        setJson("checkout.save", keys.checkout(session.cartId), session, ttlSeconds.checkout),
      delete: (cartId: string) => run("checkout.delete", () => client.del(keys.checkout(cartId))),
    },

    // 3 · Caché remota compartida (L2). Solo datos públicos: nunca carrito ni datos de cliente.
    cache: {
      get: <T>(key: string) => getJson<T>("cache.get", keys.cache(key)),
      set: (key: string, value: unknown, ttl: number = ttlSeconds.cache) =>
        setJson("cache.set", keys.cache(key), value, ttl),
      delete: (key: string) => run("cache.delete", () => client.del(keys.cache(key))),
    },

    // 4 · Rate limiting (ventana fija con INCR + EXPIRE atómicos)
    async rateLimit(bucket: RateLimitBucket, subject: string, now = Date.now()) {
      const { limit, windowSeconds, onRedisDown } = rateLimits[bucket];
      const window = Math.floor(now / 1000 / windowSeconds);
      const key = keys.rateLimit(bucket, subject, window);
      const result = await run(`rateLimit.${bucket}`, () =>
        client.multi().incr(key).expire(key, windowSeconds).exec(),
      );
      if (!result.ok) return { allowed: onRedisDown === "allow", degraded: true, remaining: 0 };
      const count = Number(result.value[0]);
      return { allowed: count <= limit, degraded: false, remaining: Math.max(0, limit - count) };
    },

    // 5 · Invalidación entre instancias de cachés L1
    publishInvalidation: (tags: readonly string[]) =>
      run("pubsub.publish", () => client.publish(invalidationChannel, JSON.stringify(tags))),

    async subscribeInvalidations(onTags: (tags: string[]) => void) {
      const subscriber = client.duplicate();
      subscriber.on("error", (error) => options.onDegraded?.("pubsub.subscriber", error));
      await subscriber.connect();
      await subscriber.subscribe(invalidationChannel, (message) => onTags(JSON.parse(message)));
      return () => subscriber.quit();
    },

    // 6 · Lock e idempotencia al confirmar el pedido
    async acquireOrderLock(idempotencyKey: string): Promise<RedisResult<string | null>> {
      const token = randomUUID();
      const result = await run("lock.acquire", () =>
        client.set(keys.orderLock(idempotencyKey), token, {
          condition: "NX",
          expiration: { type: "EX", value: ttlSeconds.orderLock },
        }),
      );
      if (!result.ok) return result;
      return { ok: true, value: result.value === "OK" ? token : null };
    },

    releaseOrderLock: (idempotencyKey: string, token: string) =>
      run("lock.release", () =>
        client.eval(releaseLockScript, {
          keys: [keys.orderLock(idempotencyKey)],
          arguments: [token],
        }),
      ),

    idempotency: {
      get: <T>(idempotencyKey: string) =>
        getJson<T>("idempotency.get", keys.idempotency(idempotencyKey)),
      set: (idempotencyKey: string, value: unknown) =>
        setJson("idempotency.set", keys.idempotency(idempotencyKey), value, ttlSeconds.idempotency),
    },
  };
}

export type RedisStore = ReturnType<typeof createRedisStore>;
