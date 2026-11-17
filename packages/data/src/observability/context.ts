// Observabilidad por request (R05): request id, logs estructurados y Server-Timing.
// El contexto viaja en AsyncLocalStorage; el cache handler reporta hit/miss/stale por un
// observer en globalThis (lo carga Next fuera del grafo de módulos de la app).
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";

export const instanceId = process.env.INSTANCE_ID ?? hostname();

export type CacheStatus = "hit" | "miss" | "stale";

export type RequestContext = {
  readonly requestId: string;
  readonly route: string;
  readonly locale?: string;
  readonly startedAt: number;
  readonly metrics: Map<string, { dur: number; count: number }>;
  readonly cache: Record<CacheStatus, number>;
};

const storage = new AsyncLocalStorage<RequestContext>();
const observerKey = Symbol.for("nudo.cache.observer");

(globalThis as Record<symbol, unknown>)[observerKey] = (status: CacheStatus) => {
  const context = storage.getStore();
  if (context) context.cache[status]++;
};

const requestIdPattern = /^[A-Za-z0-9-]{8,64}$/;

/** Reusa el id del proxy/entrada de tráfico si es válido; si no, genera uno. */
export function resolveRequestId(incoming: string | null | undefined): string {
  return incoming && requestIdPattern.test(incoming) ? incoming : randomUUID();
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function withRequestContext<T>(
  meta: { requestId: string; route: string; locale?: string },
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(
    {
      ...meta,
      startedAt: performance.now(),
      metrics: new Map(),
      cache: { hit: 0, miss: 0, stale: 0 },
    },
    fn,
  );
}

/** Contadores del proceso (no del request): prueban el anti-stampede sumando entre instancias. */
export const processCounters: Record<string, number> = {};

export function recordTiming(name: string, dur: number): void {
  processCounters[name] = (processCounters[name] ?? 0) + 1;
  const context = storage.getStore();
  if (!context) return;
  const metric = context.metrics.get(name) ?? { dur: 0, count: 0 };
  metric.dur += dur;
  metric.count++;
  context.metrics.set(name, metric);
}

/** Mide `fn` y lo suma a la métrica `name` del request actual (mongo, redis, …). */
export async function measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    recordTiming(name, performance.now() - start);
  }
}

/** Estado agregado de caché del request: cualquier miss gana, luego stale. */
export function cacheStatusOf(context: RequestContext): CacheStatus | "none" {
  if (context.cache.miss > 0) return "miss";
  if (context.cache.stale > 0) return "stale";
  if (context.cache.hit > 0) return "hit";
  return "none";
}

/** Valor del header `Server-Timing` (sin datos sensibles: solo nombres y duraciones). */
export function serverTimingHeader(context: RequestContext): string {
  const parts = [...context.metrics].map(
    ([name, { dur, count }]) => `${name};dur=${dur.toFixed(1)};desc="${count} op"`,
  );
  const { hit, miss, stale } = context.cache;
  parts.push(`cache;desc="${cacheStatusOf(context)} (hit=${hit} miss=${miss} stale=${stale})"`);
  parts.push(`total;dur=${(performance.now() - context.startedAt).toFixed(1)}`);
  return parts.join(", ");
}

type Level = "debug" | "info" | "warn" | "error";

/** Log estructurado (una línea JSON) con instancia, ruta, locale y request id. */
export function logEvent(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const context = storage.getStore();
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    instance: instanceId,
    requestId: context?.requestId,
    route: context?.route,
    locale: context?.locale,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
