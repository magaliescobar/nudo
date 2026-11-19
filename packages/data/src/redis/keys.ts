// Claves y TTLs de Redis (R03). Documentado en docs/redis-keys.md: mantener ambos en sync.
export const redisPrefix = "nudo";

/** Espacio del cache handler (ADR 006): por entorno; las entradas además llevan el deploymentId. */
export const cacheNamespace = `${redisPrefix}:${process.env.NUDO_ENV ?? process.env.NODE_ENV ?? "development"}`;

export const ttlSeconds = {
  /** Carrito de invitado: una semana sin actividad (se renueva en cada escritura). */
  cart: 7 * 24 * 60 * 60,
  /** Sesión de checkout: 1 h; el precio y stock se revalidan al confirmar. */
  checkout: 60 * 60,
  /** Caché L2 por defecto; los datos de catálogo se invalidan por tag antes. */
  cache: 15 * 60,
  /** Lock de confirmación de pedido: cubre el pago simulado más lento (timeout ≈ 8 s). */
  orderLock: 30,
  /** Resultado idempotente de un pedido confirmado: reintentos del mismo intento. */
  idempotency: 24 * 60 * 60,
} as const;

export const keys = {
  cart: (cartId: string) => `${redisPrefix}:cart:${cartId}`,
  checkout: (cartId: string) => `${redisPrefix}:checkout:${cartId}`,
  cache: (key: string) => `${redisPrefix}:cache:${key}`,
  rateLimit: (bucket: string, subject: string, window: number) =>
    `${redisPrefix}:rl:${bucket}:${subject}:${window}`,
  orderLock: (idempotencyKey: string) => `${redisPrefix}:lock:order:${idempotencyKey}`,
  idempotency: (idempotencyKey: string) => `${redisPrefix}:idem:order:${idempotencyKey}`,
  /** Log de invalidaciones (lo escribe apps/web/cache-handlers/nudo-handler.js). */
  tagLog: `${cacheNamespace}:tag-log`,
  /** Muestras RUM de Web Vitals (R35): lista acotada FIFO. */
  vitals: () => `${redisPrefix}:vitals:samples`,
} as const;

/** Máximo de muestras RUM retenidas y su TTL (7 días). */
export const vitalsMaxSamples = 5_000;
export const vitalsTtlSeconds = 7 * 24 * 60 * 60;

/** Canal pub/sub de invalidación de cachés L1 entre instancias. */
export const invalidationChannel = `${redisPrefix}:invalidate`;

/** Límites por bucket: `limit` pedidos por ventana de `windowSeconds`. */
export const rateLimits = {
  search: { limit: 30, windowSeconds: 10, onRedisDown: "allow" },
  orderConfirm: { limit: 5, windowSeconds: 60, onRedisDown: "deny" },
  /** Mutaciones de carrito por cartId: generoso, el flow normal son pocos clicks. */
  cartMutation: { limit: 30, windowSeconds: 10, onRedisDown: "allow" },
  /** Submits de pasos de checkout por cartId. */
  checkoutSubmit: { limit: 20, windowSeconds: 60, onRedisDown: "allow" },
  /** Endpoint interno de invalidación: fail-closed, frena fuerza bruta del secreto. */
  internal: { limit: 120, windowSeconds: 60, onRedisDown: "deny" },
  /** Beacons RUM por IP: ~5 métricas por página; acota firehose sin romper NAT. */
  vitals: { limit: 300, windowSeconds: 60, onRedisDown: "allow" },
} as const satisfies Record<
  string,
  { limit: number; windowSeconds: number; onRedisDown: "allow" | "deny" }
>;

export type RateLimitBucket = keyof typeof rateLimits;
