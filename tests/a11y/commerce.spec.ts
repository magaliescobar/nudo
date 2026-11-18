import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Fase 3 · accesibilidad de las superficies de comercio (R22/R23).

const pages = [
  ["home", "/es"],
  ["PLP", "/es/search?stock=1"],
  ["carrito vacío", "/es/cart"],
  ["checkout sin sesión", "/es/checkout/contact"],
] as const;

for (const [name, path] of pages) {
  test(`${name} no tiene violaciones WCAG A/AA detectables`, async ({ page }) => {
    await page.goto(path);
    // El checkout sin sesión redirige al carrito: axe analiza el destino final.
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
