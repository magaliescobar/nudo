import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { CircuitBreaker } from "../../packages/data/src/redis/breaker";
import { connectRedis } from "../../packages/data/src/redis/connect";
import { createRedisStore } from "../../packages/data/src/redis/store";

const envFile = path.resolve(__dirname, "../../.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

test.describe("R03 · Redis caído (modo degradado)", () => {
  test("las operaciones fallan rápido con `unavailable`, sin lanzar", async () => {
    // Puerto sin Redis: simula la caída.
    const client = connectRedis("redis://127.0.0.1:6399");
    const store = createRedisStore(client, { breaker: new CircuitBreaker(2, 60_000) });
    try {
      const started = Date.now();
      expect(await store.cart.get("c1")).toEqual({ ok: false, reason: "unavailable" });
      expect(await store.checkout.get("c1")).toEqual({ ok: false, reason: "unavailable" });
      expect(await store.cache.get("k")).toEqual({ ok: false, reason: "unavailable" });
      expect(await store.acquireOrderLock("idem")).toEqual({ ok: false, reason: "unavailable" });
      expect(store.breaker.state).toBe("open");
      expect(Date.now() - started).toBeLessThan(500);
      // Búsqueda: fail-open; confirmación de pedido: fail-closed.
      expect((await store.rateLimit("search", "ip")).allowed).toBe(true);
      expect((await store.rateLimit("orderConfirm", "ip")).allowed).toBe(false);
    } finally {
      client.destroy();
    }
  });

  test("el breaker se abre, espera el cooldown y vuelve a probar", () => {
    let now = 0;
    const breaker = new CircuitBreaker(2, 1_000, () => now);
    breaker.recordFailure();
    expect(breaker.state).toBe("closed");
    breaker.recordFailure();
    expect(breaker.canRequest()).toBe(false);
    now = 1_000;
    expect(breaker.state).toBe("half-open");
    breaker.recordFailure();
    expect(breaker.state).toBe("open");
    now = 2_000;
    breaker.recordSuccess();
    expect(breaker.state).toBe("closed");
  });
});

test.describe("R03 · Redis disponible", () => {
  test.skip(!process.env.REDIS_URL, "Requiere REDIS_URL (.env.local).");

  test("carrito con TTL, lock exclusivo y rate limit", async () => {
    const client = connectRedis(process.env.REDIS_URL as string);
    await new Promise<void>((resolve) =>
      client.isReady ? resolve() : client.once("ready", resolve),
    );
    const store = createRedisStore(client);
    const id = `test-${Date.now()}`;
    try {
      const cart = { id, lines: [{ sku: "X-1", qty: 2 }], updatedAt: Date.now() };
      expect((await store.cart.save(cart)).ok).toBe(true);
      expect(await store.cart.get(id)).toEqual({ ok: true, value: cart });
      expect(await client.ttl(`nudo:cart:${id}`)).toBeGreaterThan(0);

      const first = await store.acquireOrderLock(id);
      const second = await store.acquireOrderLock(id);
      expect(first.ok && typeof first.value).toBe("string");
      expect(second).toEqual({ ok: true, value: null });

      const results = [];
      for (let i = 0; i < 6; i++) results.push((await store.rateLimit("orderConfirm", id)).allowed);
      expect(results).toEqual([true, true, true, true, true, false]);
    } finally {
      await client.del([`nudo:cart:${id}`, `nudo:lock:order:${id}`]);
      client.destroy();
    }
  });
});
