import "server-only";
import { getServerEnv } from "./env";
import { connectRedis } from "./redis/connect";
import { createRedisStore, type RedisStore } from "./redis/store";

const globalForRedis = globalThis as typeof globalThis & { __nudoRedisStore?: RedisStore };
let lastErrorLog = 0;

function logDegraded(operation: string, error: unknown) {
  // Un log cada 10 s como máximo: con Redis caído cada request fallaría y llenaría los logs.
  const now = Date.now();
  if (now - lastErrorLog < 10_000) return;
  lastErrorLog = now;
  console.warn(
    `[redis] modo degradado (${operation}):`,
    error instanceof Error ? error.message : error,
  );
}

/** Singleton por instancia (en dev sobrevive al HMR en `globalThis`). */
export function getRedisStore(): RedisStore {
  globalForRedis.__nudoRedisStore ??= createRedisStore(
    connectRedis(getServerEnv().REDIS_URL, (error) => logDegraded("connection", error)),
    { onDegraded: logDegraded },
  );
  return globalForRedis.__nudoRedisStore;
}

export type { RedisResult, RedisStore } from "./redis/store";
