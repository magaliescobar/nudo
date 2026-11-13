import { createClient } from "redis";
import type { RedisClient } from "./store";

/**
 * Cliente con timeouts explícitos (R03):
 * - connectTimeout corto y reconexión con backoff acotado (no martillar un Redis caído).
 * - disableOfflineQueue: sin conexión, los comandos fallan ya en lugar de encolarse.
 * - commandOptions.timeout: tope por comando también a nivel driver.
 * Nunca se espera la conexión en el render: las operaciones consultan `isReady`.
 */
export function connectRedis(url: string, onError?: (error: unknown) => void): RedisClient {
  const client: RedisClient = createClient({
    url,
    disableOfflineQueue: true,
    commandOptions: { timeout: 300 },
    socket: {
      connectTimeout: 1_000,
      reconnectStrategy: (retries) => Math.min(100 * 2 ** retries, 5_000),
    },
  });
  client.on("error", (error) => onError?.(error));
  client.connect().catch((error) => onError?.(error));
  return client;
}
