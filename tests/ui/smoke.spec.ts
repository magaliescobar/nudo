import { expect, test } from "@playwright/test";

test.describe("Fase 0 · andamiaje", () => {
  test("la home responde y muestra la marca", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("NUDO");
  });

  test("el documento declara el idioma", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });
});
