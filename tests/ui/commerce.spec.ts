import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// Fase 3 · recorridos de compra: home con catálogo, PLP por URL, PDP,
// carrito guest y checkout multi-paso hasta la confirmación tokenizada (R10–R17).
// Corre en chromium, mobile y no-js: todos los flujos críticos usan forms reales.

test.describe.configure({ mode: "serial" });

/**
 * Agrega al carrito el SKU con más stock del producto `index`-ésimo con stock.
 * El stock del seed es bajo (1–25 por SKU) y las corridas lo consumen: elegir
 * el máximo disponible y un producto distinto por test evita flakes.
 */
async function addToCart(page: Page, request: APIRequestContext, index = 0) {
  const plp = await request.get("/api/plp?locale=es");
  const { products } = (await plp.json()) as {
    products: { id: string; slug: { es: string }; hasStock: boolean }[];
  };
  const inStock = products.filter((p) => p.hasStock);
  const product = inStock[index % inStock.length]!;

  const detailRes = await request.get(`/api/products/${product.id}`);
  const detail = (await detailRes.json()) as {
    product: { variants: { id: string; skus: { size: string; sku: string }[] }[] };
    stock: Record<string, number>;
  };
  let best: { variantId: string; size: string } | null = null;
  let bestAvailable = -1;
  for (const variant of detail.product.variants) {
    for (const sku of variant.skus) {
      const available = detail.stock[sku.sku] ?? 0;
      if (available > bestAvailable) {
        bestAvailable = available;
        best = { variantId: variant.id, size: sku.size };
      }
    }
  }
  if (!best || bestAvailable <= 0) throw new Error("sin SKU con stock en el seed");

  await page.goto(`/es/p/${product.slug.es}?v=${best.variantId}`);
  const sizeRadio = page.locator(`input[name="size"][value="${best.size}"]`);
  if ((await sizeRadio.count()) > 0) {
    // El input está oculto (radio custom): clickear la <label> que lo envuelve.
    await page.locator("label", { has: sizeRadio }).click();
  }

  // La server action setea la cookie NUDO_CART en su respuesta: esperar el POST
  // antes de navegar o /cart puede leerse antes de que el carrito exista.
  const [actionResponse] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/p/")),
    page.getByRole("button", { name: /agregar|add to cart/i }).click(),
  ]);
  // Con JS la action responde 200 (redirect via flight); sin JS el POST es un
  // document request y redirect() vuelve como 303 real al referer.
  expect([200, 303]).toContain(actionResponse.status());
}

async function fillCheckout(page: Page) {
  await page.locator('input[name="email"]').fill("playwright@nudo.test");
  await page.getByRole("button", { name: /continuar|continue/i }).click();
  await expect(page).toHaveURL(/\/es\/checkout\/shipping/);

  await page.locator('input[name="fullName"]').fill("Test Playwright");
  await page.locator('input[name="line1"]').fill("Av. Brasil 1234");
  await page.locator('input[name="city"]').fill("Montevideo");
  await page.locator('input[name="region"]').fill("Montevideo");
  await page.locator('input[name="postalCode"]').fill("11000");
  await page.locator('input[name="country"]').fill("Uruguay");
  await page.getByRole("button", { name: /continuar|continue/i }).click();
  await expect(page).toHaveURL(/\/es\/checkout\/delivery/);

  await page.locator('input[name="method"][value="standard"]').check();
  await page.getByRole("button", { name: /continuar|continue/i }).click();
  await expect(page).toHaveURL(/\/es\/checkout\/payment/);
}

test.describe("R10 · home", () => {
  test("muestra hero, categorías y tarjetas de producto", async ({ page }) => {
    await page.goto("/es");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-product-card]").first()).toBeVisible();
    // Categorías enlazan a la PLP canónica /c/...
    const categoryLink = page.locator('a[href^="/es/c/"]').first();
    await expect(categoryLink).toBeVisible();
  });
});

test.describe("R11/R12 · PLP", () => {
  test("el estado vive en la URL y los filtros son links GET", async ({ page }) => {
    await page.goto("/es/search?stock=1&sort=price-asc");
    await expect(page.locator("[data-product-card]").first()).toBeVisible();
    // Faceta de color: cada opción es un link real (funciona sin JS).
    const colorFacet = page.locator('a[href*="color="]').first();
    await expect(colorFacet).toBeVisible();
    await colorFacet.click();
    await expect(page).toHaveURL(/color=/);
    await expect(page.locator("[data-product-card]").first()).toBeVisible();
  });

  test("búsqueda sin resultados muestra empty state localizado", async ({ page }) => {
    await page.goto("/es/search?q=zzzzinexistente123");
    await expect(page.getByText(/no hay|sin resultados|no results/i)).toBeVisible();
  });
});

test.describe("R14/R15 · PDP → carrito", () => {
  test("agregar al carrito desde la PDP y ver la línea en /cart", async ({ page, request }) => {
    await addToCart(page, request, 0);

    await page.goto("/es/cart");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/carrito|cart/i);
    await expect(page.locator("[data-cart-line], li").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /finalizar compra|checkout/i })).toBeVisible();
  });
});

test.describe("R16/R17 · checkout completo", () => {
  test("recorre los 5 pasos y llega a la confirmación tokenizada", async ({ page, request }) => {
    await addToCart(page, request, 1);
    await page.goto("/es/cart");
    await page.getByRole("link", { name: /finalizar compra|checkout/i }).click();
    await expect(page).toHaveURL(/\/es\/checkout\/contact/);

    // 1 · contacto → 2 · envío → 3 · entrega → 4 · pago
    await fillCheckout(page);

    await page.locator('input[name="cardName"]').fill("Test Playwright");
    await page.locator('input[name="cardNumber"]').fill("4111111111111111");
    await page.getByRole("button", { name: /revisar pedido|review order/i }).click();
    await expect(page).toHaveURL(/\/es\/checkout\/review/);

    // 5 · confirmación → redirect a la ruta privada con token
    await page.getByRole("button", { name: /confirmar pedido|place order/i }).click();
    await page.waitForURL(/\/es\/order\/[^?]+\?token=/);
    await expect(page.getByRole("heading", { name: /gracias|thanks/i })).toBeVisible();

    // El número de pedido sin token no debe revelar nada (404 real vía proxy).
    const orderUrl = new URL(page.url());
    const bare = `${orderUrl.origin}${orderUrl.pathname}`;
    const response = await page.goto(bare);
    expect(response?.status()).toBe(404);
  });

  test("un pago rechazado (····0002) muestra error en la revisión", async ({ page, request }) => {
    await addToCart(page, request, 2);
    await page.goto("/es/cart");
    await page.getByRole("link", { name: /finalizar compra|checkout/i }).click();
    await fillCheckout(page);

    await page.locator('input[name="cardName"]').fill("Test Playwright");
    await page.locator('input[name="cardNumber"]').fill("4000000000000002");
    await page.getByRole("button", { name: /revisar pedido|review order/i }).click();
    await expect(page).toHaveURL(/\/es\/checkout\/review/);

    await page.getByRole("button", { name: /confirmar pedido|place order/i }).click();
    // Gateway fake: ····0002 declina → error inline, sin cargo ni pedido.
    await expect(page.locator('p[role="alert"]')).toContainText(/rechaz|declin|reject/i);
    await expect(page).toHaveURL(/\/es\/checkout\/review/);
  });
});
