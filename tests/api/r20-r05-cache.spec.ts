import { expect, test } from "@playwright/test";
import { isValidTag, tagsForMutation } from "../../packages/data/src/cache/tags";
import {
  auth,
  cacheTiming,
  hasCacheEnv,
  invalidate,
  mongoQueries,
  productTags,
  type SampleProduct,
  sampleProduct,
} from "../support/cache";

test.describe("R20 · tags por mutación (§3.4)", () => {
  test("stock invalida solo stock:{sku}; precio/slug/estado invalidan ficha y categorías", () => {
    expect(tagsForMutation({ kind: "stock", skus: ["A-1", "A-2"] })).toEqual([
      "stock:A-1",
      "stock:A-2",
    ]);
    expect(tagsForMutation({ kind: "price", productId: "p1", categoryIds: ["c1"] })).toEqual([
      "product:p1",
      "category:c1",
    ]);
    expect(tagsForMutation({ kind: "slug", productId: "p1", categoryIds: [] })).toContain(
      "catalog",
    );
    expect(isValidTag("product:abc")).toBe(true);
    expect(isValidTag("product:../x")).toBe(false);
    expect(isValidTag("cart:123")).toBe(false);
  });
});

test.describe("R20/R05 · caché multinivel en una instancia", () => {
  test.skip(
    !hasCacheEnv,
    "Requiere MONGODB_URI e INTERNAL_API_SECRET (.env.local, pnpm env:secrets).",
  );
  test.describe.configure({ mode: "serial" });

  let product: SampleProduct;
  test.beforeAll(async () => {
    product = await sampleProduct(10);
  });

  test("segunda lectura es hit; tras invalidar es miss y después hit otra vez", async ({
    request,
  }) => {
    const url = `/api/products/${product.id}`;
    await request.get(url);
    expect(cacheTiming(await request.get(url)).status).toBe("hit");

    await invalidate(request, [`product:${product.id}`]);
    const afterInvalidation = cacheTiming(await request.get(url));
    expect(afterInvalidation.status).toBe("miss");
    // Solo se invalidó la ficha: la entrada de stock sigue siendo hit.
    expect(afterInvalidation).toMatchObject({ hit: 1, miss: 1 });
    expect(cacheTiming(await request.get(url)).status).toBe("hit");
  });

  test("stampede: 100 requests concurrentes al expirar ⇒ una consulta a Mongo por clave", async ({
    request,
  }) => {
    const url = `/api/products/${product.id}`;
    await request.get(url);
    await invalidate(request, productTags(product));
    const before = await mongoQueries(request);

    const responses = await Promise.all(Array.from({ length: 100 }, () => request.get(url)));
    expect(responses.every((r) => r.ok())).toBe(true);

    // Dos claves (ficha + stock del producto) ⇒ exactamente dos consultas, no cien.
    expect((await mongoQueries(request)) - before).toBe(2);
  });

  test("Server-Timing, request id, instancia y Cache-Control coherentes", async ({ request }) => {
    const response = await request.get(`/api/products/${product.id}`, {
      headers: { "x-request-id": "test-request-0001" },
    });
    const headers = response.headers();
    expect(headers["x-request-id"]).toBe("test-request-0001");
    expect(headers["x-instance-id"]).toBeTruthy();
    expect(headers["server-timing"]).toMatch(/catalog;dur=[\d.]+/);
    expect(headers["server-timing"]).toMatch(/total;dur=[\d.]+/);
    expect(headers["cache-control"]).toContain("s-maxage=30");

    const missing = await request.get("/api/products/000000000000000000000000");
    expect(missing.status()).toBe(404);
  });

  test("endpoint interno: secreto, validación y log de invalidaciones con timestamp", async ({
    request,
  }) => {
    const denied = await request.post("/api/internal/invalidate", {
      headers: { authorization: "Bearer incorrecto" },
      data: { tags: ["catalog"] },
    });
    expect(denied.status()).toBe(401);
    expect(denied.headers()["cache-control"]).toBe("no-store");
    expect(denied.headers()["x-robots-tag"]).toContain("noindex");

    const invalid = await request.post("/api/internal/invalidate", {
      headers: auth(),
      data: { tags: ["cart:secreto"] },
    });
    expect(invalid.status()).toBe(400);

    const tag = `product:${product.id}`;
    const before = Date.now();
    await invalidate(request, [tag]);
    const log = await (await request.get("/api/internal/invalidate", { headers: auth() })).json();
    const entry = log.invalidations.find((i: { tag: string }) => i.tag === tag);
    expect(entry).toMatchObject({ tag, kind: "expire" });
    expect(entry.at).toBeGreaterThanOrEqual(before - 1_000);
    expect(entry.instance).toBeTruthy();
  });
});
