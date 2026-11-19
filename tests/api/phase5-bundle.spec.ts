// R34: budgets de First Load JS por ruta contra el server en vivo.
// Misma logica que scripts/bundle-budget.mjs — falla si una ruta excede.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const base = (process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100").replace(/\/+$/, "");
const budgets = JSON.parse(
  readFileSync(path.join(__dirname, "../../scripts/bundle-budget.json"), "utf8"),
) as Record<string, number>;

const ROUTES: [string, string][] = [
  ["home", "/es"],
  ["plp", "/es/c/tops"],
  ["search", "/es/search?q=remera"],
  ["cart", "/es/cart"],
];

const CHUNK_RE = /\/_next\/static\/chunks\/[^"']+?\.js/g;

test.describe("R34 — budgets de First Load JS (gzip)", () => {
  for (const [route, url] of ROUTES) {
    const budget = budgets[route] ?? 0;
    test(`${route} (${url}) <= ${(budget / 1024).toFixed(0)}k gzip`, async ({ request }) => {
      const res = await request.get(`${base}${url}`);
      expect(res.status()).toBe(200);
      const files = new Set((await res.text()).match(CHUNK_RE) ?? []);
      let total = 0;
      for (const file of files) {
        const body = await (await request.get(`${base}${file}`)).body();
        total += gzipSync(body, { level: 6 }).length;
      }
      expect(
        total,
        `${route}: ${(total / 1024).toFixed(1)}k gzip en ${files.size} chunks`,
      ).toBeLessThanOrEqual(budget);
    });
  }
});
