// R35: endpoint RUM /api/vitals — validación de beacons y agregado p75.
import { expect, test } from "@playwright/test";

const base = (process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100").replace(/\/+$/, "");

test.describe("R35 — /api/vitals", () => {
  test("acepta un beacon válido (204)", async ({ request }) => {
    const res = await request.post(`${base}/api/vitals`, {
      data: { name: "LCP", value: 1234.5, rating: "good", page: "/es" },
    });
    expect(res.status()).toBe(204);
  });

  test("rechaza métrica desconocida / value inválido / page inválida (400)", async ({
    request,
  }) => {
    for (const data of [
      { name: "EVIL", value: 1, rating: "good", page: "/es" },
      { name: "LCP", value: -1, rating: "good", page: "/es" },
      { name: "LCP", value: Number.NaN, rating: "good", page: "/es" },
      { name: "LCP", value: 1, rating: "excellent", page: "/es" },
      { name: "LCP", value: 1, rating: "good", page: "https://evil.example" },
    ]) {
      const res = await request.post(`${base}/api/vitals`, { data });
      expect(res.status(), JSON.stringify(data)).toBe(400);
    }
  });

  test("rechaza JSON inválido (400)", async ({ request }) => {
    const res = await request.post(`${base}/api/vitals`, {
      data: "not-json{{",
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("GET agrega p75 por métrica×página", async ({ request }) => {
    const res = await request.get(`${base}/api/vitals`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.samples).toBe("number");
    expect(Array.isArray(body.report)).toBe(true);
    if (body.samples > 0) {
      const row = body.report[0];
      expect(row).toHaveProperty("name");
      expect(row).toHaveProperty("page");
      expect(row).toHaveProperty("p75");
      expect(row).toHaveProperty("n");
    }
  });
});
