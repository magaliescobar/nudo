// R04 contra el compose (3 instancias + nginx). Levantar antes:
//   pnpm env:secrets && docker compose up --build -d
//   MULTI_BASE_URL=http://localhost:8080 pnpm test:multi
import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import {
  cacheTiming,
  hasCacheEnv,
  invalidate,
  mongoQueries,
  productTags,
  type SampleProduct,
  sampleProduct,
  withDb,
} from "../support/cache";

const instances = ["web-1", "web-2", "web-3"] as const;
const on = (instance: string) => ({ "x-nudo-instance": instance });

test.describe("R04 · multi-instancia", () => {
  test.skip(
    !process.env.MULTI_BASE_URL || !hasCacheEnv,
    "Requiere MULTI_BASE_URL y el compose levantado.",
  );
  test.describe.configure({ mode: "serial" });

  let product: SampleProduct;
  test.beforeAll(async () => {
    product = await sampleProduct(20);
  });

  test("la entrada reparte entre las 3 instancias y x-instance-id lo muestra", async ({
    request,
  }) => {
    // Una instancia recién reiniciada queda fuera del pool hasta `fail_timeout` (5 s) de nginx.
    const seen = new Set<string>();
    await expect
      .poll(
        async () => {
          for (let i = 0; i < 6; i++) {
            const response = await request.get("/api/health");
            seen.add(response.headers()["x-instance-id"] ?? "");
          }
          return [...seen].sort();
        },
        { timeout: 15_000, intervals: [500] },
      )
      .toEqual([...instances]);
  });

  test("L2 compartida: miss en web-1, hit en web-2 y web-3", async ({ request }) => {
    const url = `/api/products/${product.id}`;
    await invalidate(request, productTags(product), on("web-1"));

    const first = await request.get(url, { headers: on("web-1") });
    expect(first.headers()["x-instance-id"]).toBe("web-1");
    expect(cacheTiming(first).status).toBe("miss");

    for (const instance of ["web-2", "web-3"]) {
      const response = await request.get(url, { headers: on(instance) });
      expect(response.headers()["x-instance-id"]).toBe(instance);
      expect(cacheTiming(response).status).toBe("hit");
    }
  });

  test("un cambio hecho vía web-1 se ve en web-2 y web-3 sin esperar TTL", async ({ request }) => {
    const url = `/api/products/${product.id}`;
    for (const instance of instances) await request.get(url, { headers: on(instance) });

    const renamed = `${product.nameEs} · ${Date.now()}`;
    const setName = (name: string) =>
      withDb((db) =>
        db
          .collection("products")
          .updateOne({ _id: new ObjectId(product.id) }, { $set: { "name.es": name } }),
      );
    await setName(renamed);
    try {
      await invalidate(request, [`product:${product.id}`], on("web-1"));
      for (const instance of ["web-2", "web-3"]) {
        const body = await (await request.get(url, { headers: on(instance) })).json();
        expect(body.product.name.es).toBe(renamed);
      }
    } finally {
      await setName(product.nameEs);
      await invalidate(request, [`product:${product.id}`], on("web-1"));
    }
  });

  test("stampede entre instancias: 150 requests ⇒ una consulta a Atlas por clave", async ({
    request,
  }) => {
    const url = `/api/products/${product.id}`;
    await invalidate(request, productTags(product), on("web-1"));
    const count = async () =>
      (await Promise.all(instances.map((i) => mongoQueries(request, on(i))))).reduce(
        (a, b) => a + b,
      );
    const before = await count();

    const responses = await Promise.all(
      Array.from({ length: 150 }, (_, i) => request.get(url, { headers: on(instances[i % 3]!) })),
    );
    expect(responses.every((r) => r.ok())).toBe(true);
    expect((await count()) - before).toBe(2);
  });

  test("matar una instancia a mitad del recorrido no rompe requests ni pierde estado", async ({
    request,
  }) => {
    const url = `/api/products/${product.id}`;
    const statuses: number[] = [];
    const served = new Set<string>();
    try {
      for (let i = 0; i < 30; i++) {
        if (i === 10) execFileSync("docker", ["compose", "kill", "web-2"], { stdio: "ignore" });
        const response = await request.get(url);
        statuses.push(response.status());
        served.add(response.headers()["x-instance-id"] ?? "");
        if (i >= 10) expect(response.headers()["x-instance-id"]).not.toBe("web-2");
      }
    } finally {
      execFileSync("docker", ["compose", "start", "web-2"], { stdio: "ignore" });
    }
    expect(statuses.every((s) => s === 200)).toBe(true);
    expect(served.size).toBeGreaterThanOrEqual(2);
  });
});
