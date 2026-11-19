// R23: View Transitions — morph de la imagen tarjeta→PDP (elemento compartido con
// view-transition-name único por producto), slide horizontal del checkout,
// pulso del contador del carrito, desactivado con prefers-reduced-motion.
// Solo aplica con JS: sin JS las navegaciones son full-page loads.
import { expect, test } from "@playwright/test";

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name === "no-js", "Las View Transitions requieren JavaScript");
});

// Espía document.startViewTransition y captura los view-transition-name que
// React asigna a los elementos durante el callback del snapshot.
const spyScript = `(() => {
  const orig = document.startViewTransition?.bind(document);
  window.__vt = { calls: 0, names: [] };
  if (orig) {
    document.startViewTransition = (cb) => {
      window.__vt.calls++;
      const t = orig(cb);
      t.updateCallbackDone.then(() => {
        window.__vt.names = [...document.querySelectorAll("*")]
          .map((e) => e.style.viewTransitionName)
          .filter((n) => n && n !== "none");
      }).catch(() => {});
      return t;
    };
  }
})()`;

test.describe("R23 — View Transitions", () => {
  test("la imagen de la tarjeta morfa hacia la imagen de la PDP", async ({ page }) => {
    await page.addInitScript(spyScript);
    await page.goto("/es/c/calzado");
    await page.locator('a[href*="/p/"]').first().click();
    await page.waitForURL(/\/p\//);
    await page.waitForTimeout(600);

    const vt = await page.evaluate(
      () => (globalThis as unknown as { __vt: { calls: number; names: string[] } }).__vt,
    );
    expect(vt.calls).toBeGreaterThanOrEqual(1);

    // El nombre compartido aparece dos veces durante el snapshot: la tarjeta
    // saliente y la imagen entrante de la PDP del producto clickeado.
    const counts = new Map<string, number>();
    for (const name of vt.names.filter((n) => n.startsWith("product-image-"))) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    expect(Math.max(0, ...counts.values())).toBe(2);
  });

  test("agregar al carrito dispara una transición de update (pulso del badge)", async ({
    page,
  }) => {
    await page.addInitScript(spyScript);
    await page.goto("/es/p/bota-hormigon-pro-074");

    // Talle habilitado + submit del form de variantes.
    const addOnce = async () => {
      await page.locator('input[name="size"]:enabled').first().check();
      await page.getByRole("button", { name: /agregar|añadir|add/i }).click();
    };
    await addOnce();

    await expect(async () => {
      const vt = await page.evaluate(
        () => (globalThis as unknown as { __vt: { calls: number } }).__vt,
      );
      expect(vt.calls).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10_000 });

    // Regresión: una segunda adición del MISMO sku refresca el badge (la action
    // llama `refresh()`; si no, el redirect al mismo url no reconsulta y el
    // contador parecía no sumar).
    await addOnce();
    await expect(page.locator("header")).toContainText("2", { timeout: 10_000 });
  });

  test("el CSS define slide del checkout, pulso y corte por reduced-motion", async ({ page }) => {
    await page.goto("/es/cart");
    const css = await page.evaluate(() => {
      const parts: string[] = [];
      const sheets = Array.from(
        (globalThis as unknown as { document: { styleSheets: ArrayLike<unknown> } }).document
          .styleSheets,
      ) as Array<{ cssRules: ArrayLike<{ cssText: string }> }>;
      for (const sheet of sheets) {
        try {
          for (const rule of Array.from(sheet.cssRules)) parts.push(rule.cssText);
        } catch {
          // hojas cross-origin no se leen; las nuestras son same-origin
        }
      }
      return parts.join("\n");
    });

    expect(css).toContain("vt-slide-in");
    expect(css).toContain("vt-slide-out");
    expect(css).toContain("vt-pulse");
    expect(css).toMatch(/prefers-reduced-motion[^{]*\{[\s\S]*view-transition/);
  });
});
