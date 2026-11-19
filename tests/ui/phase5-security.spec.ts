// R38: el cliente nunca puede fijar precios — un POST de add-to-cart con campos
// de precio manipulados se ignora: el subtotal sale del catálogo en servidor.
// Replica el POST MPA real (multipart + $ACTION_ID), sin depender del DOM.
import { expect, test } from "@playwright/test";

test.describe("R38 — precio solo del servidor", () => {
  test("un campo price manipulado en el POST no cambia el subtotal", async ({ page }) => {
    await page.goto("/es/p/buzo-neon-tecnica-049");
    const html = await page.content();

    const actionId = html.match(/name="(\$ACTION_ID_[a-f0-9]+)"/)?.[1];
    const productId = html.match(/name="productId" value="([^"]+)"/)?.[1];
    const variantId = html.match(/name="variantId" value="([^"]+)"/)?.[1];
    const size =
      html.match(/name="size" checked[^>]*value="([^"]+)"/)?.[1] ??
      html.match(/name="size"(?![^>]*disabled)[^>]*value="([^"]+)"/)?.[1];
    expect(actionId && productId && variantId && size).toBeTruthy();

    // POST igual que el form sin JS + campos inyectados que intentan regalar el precio.
    await page.request.post("/es/p/buzo-neon-tecnica-049", {
      multipart: {
        [actionId!]: "",
        productId: productId!,
        variantId: variantId!,
        size: size!,
        price: "1",
        lineTotal: "1",
        amountInCents: "1",
      },
    });

    await page.goto("/es/cart");
    const body = await page.locator("main").innerText();
    // El carrito cobra el precio real del catálogo (>>1), nunca el "1" inyectado.
    expect(body).not.toMatch(/\$\s?0[.,]01\b/);
    const amount = body.match(/US\$\s?([\d.,]+)/)?.[1];
    expect(amount).toBeTruthy();
    expect(Number(amount!.replace(/\./g, "").replace(",", "."))).toBeGreaterThan(1);
  });
});
