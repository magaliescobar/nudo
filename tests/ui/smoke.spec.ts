import { expect, test } from "@playwright/test";

test.describe("Andamiaje · home localizada", () => {
  test("la home responde y muestra la marca", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("NUDO");
  });

  test.describe("navegador en español", () => {
    test.use({ locale: "es-UY" });

    test("`/` negocia `/es` y el documento declara el idioma", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/es$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "es");
    });
  });

  test.describe("navegador en inglés", () => {
    test.use({ locale: "en-GB" });

    test("`/` negocia `/en` y el documento declara el idioma", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL(/\/en$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
  });
});
