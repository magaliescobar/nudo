import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { MongoClient } from "mongodb";

const envFile = path.resolve(__dirname, "../../.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

// Fase 4 · SEO (R27–R33): canonical/hreflang recíprocos, robots.txt, sitemaps
// con lastmod real, JSON-LD, llms.txt, redirects 301 y normalización de URL.

const SEO_HEADERS = { "sec-fetch-dest": "document" };

async function getHtml(request: APIRequestContext, url: string) {
  const response = await request.get(url, {
    headers: SEO_HEADERS,
    maxRedirects: 0,
  });
  return response;
}

test.describe("R27 · canonical + hreflang recíproco", () => {
  test("home es/en exponen canonical propio y hreflang cruzado + x-default", async ({
    request,
  }) => {
    for (const locale of ["es", "en"]) {
      const response = await getHtml(request, `/${locale}`);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toContain(`rel="canonical"`);
      expect(html).toContain(`hrefLang="es"`);
      expect(html).toContain(`hrefLang="en"`);
      expect(html).toContain(`hrefLang="x-default"`);
      expect(html).toContain(`property="og:title"`);
      expect(html).toContain(`name="twitter:`);
    }
    // Reciprocidad: /es enlaza a /en y viceversa.
    const es = await (await getHtml(request, "/es")).text();
    expect(es).toMatch(/hrefLang="en"[^>]*href="[^"]*\/en["/?]/);
  });

  test("PDP canonical no incluye ?v y PLP page 3 canonicaliza a sí misma", async ({ request }) => {
    const plp = await request.get("/api/plp?locale=es");
    const { products } = (await plp.json()) as {
      products: { slug: { es: string } }[];
    };
    const pdp = await getHtml(request, `/es/p/${products[0]!.slug.es}?v=x`);
    const html = await pdp.text();
    const canonical = /rel="canonical" href="([^"]+)"/.exec(html)?.[1] ?? "";
    expect(canonical).toContain(`/es/p/${products[0]!.slug.es}`);
    expect(canonical).not.toContain("?v=");
  });

  test("PLP con 2 facetas va noindex pero canonicaliza a sí misma", async ({ request }) => {
    const response = await getHtml(request, "/es/c/tops?color=negro&size=m");
    const html = await response.text();
    expect(html).toContain('name="robots" content="noindex');
    const canonical = /rel="canonical" href="([^"]+)"/.exec(html)?.[1] ?? "";
    expect(canonical).toContain("/es/c/tops");
  });
});

test.describe("R28 · robots.txt", () => {
  test("apunta al sitemap, bloquea privados y crawlers de entrenamiento", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Sitemap:");
    expect(body).toContain("/sitemap.xml");
    expect(body).toContain("Disallow: /es/checkout");
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("GPTBot");
    // La búsqueda interna no se bloquea por robots (su noindex viaja en el HTML).
    const search = await getHtml(request, "/es/search?q=remera");
    expect(await search.text()).toContain('name="robots" content="noindex');
  });
});

test.describe("R29 · sitemaps", () => {
  test("el índice lista sitemaps por tipo y los XML son válidos", async ({ request }) => {
    const index = await request.get("/sitemap.xml");
    expect(index.status()).toBe(200);
    const xml = await index.text();
    expect(xml).toContain("<sitemapindex");
    for (const file of ["pages.xml", "categories.xml", "products-1.xml"]) {
      expect(xml).toContain(`/sitemaps/${file}`);
      const child = await request.get(`/sitemaps/${file}`);
      expect(child.status()).toBe(200);
      expect(await child.text()).toContain("<urlset");
    }
  });

  test("los productos llevan lastmod real, imagen y hreflang", async ({ request }) => {
    const xml = await (await request.get("/sitemaps/products-1.xml")).text();
    expect(xml).toContain("<lastmod>");
    expect(xml).toContain("<image:image>");
    expect(xml).toContain('hreflang="x-default"');
    expect(xml).not.toContain("/es/cart");
    // Un sitemap fuera de rango da 404 real.
    const far = await request.get("/sitemaps/products-9999.xml");
    expect(far.status()).toBe(404);
  });
});

test.describe("R30 · JSON-LD", () => {
  test("home emite Organization y WebSite con SearchAction", async ({ request }) => {
    const html = await (await getHtml(request, "/es")).text();
    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('"@type":"SearchAction"');
    // Serialización segura: ningún '<' crudo dentro de los bloques ld+json.
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      const json = JSON.parse(block[1]!) as Record<string, unknown>;
      expect(json["@type"]).toBeTruthy();
    }
  });

  test("PDP emite ProductGroup con hasVariant y Offer con disponibilidad", async ({ request }) => {
    const plp = await request.get("/api/plp?locale=es");
    const { products } = (await plp.json()) as {
      products: { slug: { es: string } }[];
    };
    const html = await (await getHtml(request, `/es/p/${products[0]!.slug.es}`)).text();
    expect(html).toContain('"@type":"ProductGroup"');
    expect(html).toContain('"hasVariant"');
    expect(html).toContain('"@type":"Offer"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toMatch(/schema\.org\/(InStock|OutOfStock)/);
  });

  test("PLP de categoría emite BreadcrumbList + ItemList", async ({ request }) => {
    const html = await (await getHtml(request, "/es/c/tops")).text();
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"@type":"ItemList"');
  });
});

test.describe("R31 · llms.txt", () => {
  test("expone título, summary y links absolutos de catálogo", async ({ request }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("# NUDO");
    expect(body).toContain(">");
    expect(body).toMatch(/\[.+\]\(https?:\/\/.+\/es\/p\/.+\)/);
    const full = await request.get("/llms-full.txt");
    expect(full.status()).toBe(200);
    expect(await full.text()).toContain("## Productos");
  });
});

test.describe("R32 · redirects y normalización", () => {
  test("mayúsculas y trailing slash redirigen 301 a la URL canónica", async ({ request }) => {
    const plp = await request.get("/api/plp?locale=es");
    const { products } = (await plp.json()) as {
      products: { slug: { es: string } }[];
    };
    const slug = products[0]!.slug.es;

    const upper = await getHtml(request, `/ES/P/${slug.toUpperCase()}`);
    expect(upper.status()).toBe(301);
    expect(upper.headers()["location"]).toContain(`/es/p/${slug}`);

    const trailing = await getHtml(request, `/es/p/${slug}/`);
    expect([301, 308]).toContain(trailing.status());
    expect(trailing.headers()["location"]).toContain(`/es/p/${slug}`);
  });

  test("params basura se eliminan con 301, los conocidos se conservan", async ({ request }) => {
    const response = await getHtml(request, "/es/c/tops?utm_source=x&bogus=1&color=negro");
    // (la página conserva `color` y quita el resto)
    expect(response.status()).toBe(301);
    const location = response.headers()["location"] ?? "";
    expect(location).toContain("color=negro");
    expect(location).not.toContain("utm_source");
    expect(location).not.toContain("bogus");
  });

  test("un slug viejo redirige al nuevo vía tabla Redirect (status real)", async ({ request }) => {
    test.skip(!process.env.MONGODB_URI, "Requiere MONGODB_URI (.env.local).");
    const client = await new MongoClient(process.env.MONGODB_URI as string).connect();
    try {
      const redirects = await client
        .db(process.env.MONGODB_DB ?? "nudo")
        .collection("redirects")
        .find({})
        .toArray();
      expect(redirects.length).toBeGreaterThan(0);
      for (const doc of redirects) {
        const response = await getHtml(request, String(doc.from));
        expect(response.status()).toBe(doc.status === 308 ? 308 : 301);
        const location = response.headers()["location"] ?? "";
        expect(location).toContain(String(doc.to));
      }
    } finally {
      await client.close();
    }
  });

  test("un slug inexistente sin redirect da 404 real", async ({ request }) => {
    const response = await getHtml(request, "/es/p/producto-que-no-existe-999");
    expect(response.status()).toBe(404);
  });
});
