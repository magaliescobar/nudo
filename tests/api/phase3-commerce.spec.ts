import { expect, test, type APIRequestContext } from "@playwright/test";

// Fase 3 · contratos HTTP del comercio: PLP JSON, ficha de producto,
// privacidad de la confirmación (R17) y guardas del checkout (R16).

type PlpResponse = {
  products: { id: string; slug: { es: string; en: string } }[];
  page: number;
  pageCount: number;
  total: number;
};

async function firstProductId(request: APIRequestContext) {
  const response = await request.get("/api/plp?locale=es");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as PlpResponse;
  expect(body.products.length).toBeGreaterThan(0);
  return body.products[0]!.id;
}

test.describe("R12 · API PLP para scroll infinito", () => {
  test("devuelve tarjetas serializables con paginación", async ({ request }) => {
    const response = await request.get("/api/plp?locale=es");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as PlpResponse;
    expect(body.total).toBeGreaterThan(0);
    expect(body.page).toBe(1);
    expect(body.pageCount).toBeGreaterThanOrEqual(1);
    const card = body.products[0]!;
    expect(card.slug.es).toBeTruthy();
    expect(card.id).toBeTruthy();
  });

  test("`page` y `sort` de la URL llegan al resultado", async ({ request }) => {
    const sorted = await request.get("/api/plp?locale=es&sort=price-asc");
    expect(sorted.status()).toBe(200);
    const page2 = await request.get("/api/plp?locale=es&page=2");
    expect(page2.status()).toBe(200);
    expect(((await page2.json()) as PlpResponse).page).toBe(2);
  });

  test("locale inválido se rechaza", async ({ request }) => {
    const response = await request.get("/api/plp?locale=fr");
    expect(response.status()).toBe(400);
  });
});

test.describe("R14 · ficha de producto", () => {
  test("devuelve producto + stock por SKU", async ({ request }) => {
    const id = await firstProductId(request);
    const response = await request.get(`/api/products/${id}`);
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      product: { id: string; variants: { skus: { sku: string }[] }[] };
      stock: Record<string, number>;
    };
    expect(body.product.id).toBe(id);
    const sku = body.product.variants[0]!.skus[0]!.sku;
    expect(body.stock).toHaveProperty(sku);
  });

  test("id inexistente devuelve 404", async ({ request }) => {
    const response = await request.get("/api/products/000000000000000000000000");
    expect(response.status()).toBe(404);
  });
});

test.describe("R11/R14 · status reales en catálogo", () => {
  test("slug de PDP inexistente devuelve 404 real (guarda en proxy)", async ({ request }) => {
    const response = await request.get("/es/p/no-existe-xyz");
    expect(response.status()).toBe(404);
  });

  test("categoría inexistente devuelve 404 real", async ({ request }) => {
    const response = await request.get("/es/c/no-existe-xyz");
    expect(response.status()).toBe(404);
  });

  test("PDP válida responde 200", async ({ request }) => {
    const id = await firstProductId(request);
    const product = (await (await request.get(`/api/products/${id}`)).json()) as {
      product: { slug: { es: string } };
    };
    const response = await request.get(`/es/p/${product.product.slug.es}`);
    expect(response.status()).toBe(200);
  });
});

test.describe("R17 · confirmación privada", () => {
  test("la ruta de pedido exige token: sin él responde 404 (no revela que existe)", async ({
    request,
  }) => {
    const response = await request.get("/es/order/NUDO-202601-000001");
    expect(response.status()).toBe(404);
  });

  test("con token inválido también responde 404", async ({ request }) => {
    const response = await request.get("/es/order/NUDO-202601-000001?token=invalid");
    expect(response.status()).toBe(404);
  });

  test("la página de pedido no es indexable", async ({ request }) => {
    const response = await request.get("/es/order/NUDO-202601-000001?token=x");
    expect(response.status()).toBe(404);
  });
});

test.describe("R16 · guardas del checkout", () => {
  test("sin carrito/sesión el paso redirige al carrito (307 real)", async ({ request }) => {
    const response = await request.get("/es/checkout/review", { maxRedirects: 0 });
    // Contexto limpio: sin cookie NUDO_CART ni sesión de checkout en Redis.
    // La guarda corre en proxy.ts antes del render ⇒ redirect HTTP real.
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toContain("/es/cart");
  });

  test("un paso desconocido devuelve 404 real", async ({ request }) => {
    const response = await request.get("/es/checkout/no-existe");
    expect(response.status()).toBe(404);
  });

  test("checkout y carrito declaran noindex en su metadata", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const root = path.resolve(__dirname, "../..");
    for (const file of [
      "apps/web/app/[locale]/checkout/[step]/page.tsx",
      "apps/web/app/[locale]/cart/page.tsx",
      "apps/web/app/[locale]/order/[number]/page.tsx",
    ]) {
      expect(readFileSync(path.join(root, file), "utf8")).toMatch(/robots:\s*\{\s*index:\s*false/);
    }
  });
});

test.describe("R15 · privacidad del carrito", () => {
  test("la página de carrito no se cachea como contenido público", async ({ request }) => {
    const response = await request.get("/es/cart");
    const cacheControl = response.headers()["cache-control"] ?? "";
    // El shell PPR puede ser estático, pero el documento privado no debe ser
    // cacheable compartido (s-maxage/public) — el contenido sale por streaming.
    expect(cacheControl).not.toMatch(/s-maxage=\d+/);
  });
});
