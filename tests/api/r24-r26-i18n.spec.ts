import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { locales } from "../../packages/i18n/src/config";
import { formatList, formatPrice, plural } from "../../packages/i18n/src/format";
import { negotiateLocale } from "../../packages/i18n/src/negotiate";

const root = path.resolve(__dirname, "../..");

test.describe("R24 · negociación de idioma", () => {
  test("cookie → Accept-Language → default", () => {
    expect(negotiateLocale({ cookie: "en", acceptLanguage: "es-UY" })).toBe("en");
    expect(negotiateLocale({ acceptLanguage: "es-UY,es;q=0.9" })).toBe("es");
    expect(negotiateLocale({ acceptLanguage: "fr-FR,en-GB;q=0.8" })).toBe("en");
    expect(negotiateLocale({ acceptLanguage: "en;q=0,es;q=0.5" })).toBe("es");
    expect(negotiateLocale({ cookie: "xx", acceptLanguage: "fr" })).toBe("es");
    expect(negotiateLocale({})).toBe("es");
  });

  test("usuario con cookie `en` que entra a `/` va a `/en`", async ({ request }) => {
    const response = await request.get("/", {
      headers: { cookie: "NUDO_LOCALE=en", "accept-language": "es-UY" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location ?? "", "http://x").pathname).toBe("/en");
  });

  test("sin cookie y con `Accept-Language: es-UY` va a `/es`", async ({ request }) => {
    const response = await request.get("/", {
      headers: { "accept-language": "es-UY" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location ?? "", "http://x").pathname).toBe("/es");
    expect(response.headers().vary).toMatch(/Accept-Language/);
  });

  test("un crawler sin preferencias recibe el default, nunca un redirect por IP", async ({
    request,
  }) => {
    const response = await request.get("/", {
      headers: { "user-agent": "Googlebot/2.1", "x-forwarded-for": "200.40.0.1" },
      maxRedirects: 0,
    });
    expect(new URL(response.headers().location ?? "", "http://x").pathname).toBe("/es");
  });

  test("`<html>` declara lang y dir de cada idioma", async ({ request }) => {
    for (const locale of locales) {
      const html = await (await request.get(`/${locale}`)).text();
      expect(html).toMatch(new RegExp(`<html[^>]*lang="${locale}"[^>]*dir="ltr"`));
    }
  });
});

test.describe("R25 · formato con Intl", () => {
  test("plurales sin `if`s manuales", () => {
    const es = { one: "# producto", other: "# productos" };
    const en = { one: "# product", other: "# products" };
    expect(plural("es", 1, es)).toBe("1 producto");
    expect(plural("es", 2, es)).toBe("2 productos");
    expect(plural("en", 1, en)).toBe("1 product");
    expect(plural("en", 2, en)).toBe("2 products");
  });

  test("precios en USD y listas según el idioma", () => {
    expect(formatPrice("en", 12345)).toBe("$123.45");
    expect(formatPrice("es", 12345)).toMatch(/123,45/);
    expect(formatList("es", ["S", "M", "L"])).toBe("S, M y L");
    expect(formatList("en", ["S", "M", "L"])).toBe("S, M, and L");
  });
});

test.describe("R26 · extensibilidad", () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return name === "node_modules" ? [] : sourceFiles(full);
      return /\.(ts|tsx)$/.test(name) ? [full] : [];
    });
  }

  test("páginas y componentes no nombran idiomas concretos", () => {
    const literal = new RegExp(`["'\`/](${locales.join("|")})["'\`/]`);
    const offenders = [
      ...sourceFiles(path.join(root, "apps/web/app")),
      ...sourceFiles(path.join(root, "packages/ui/src")),
      path.join(root, "apps/web/proxy.ts"),
    ].filter((file) => literal.test(readFileSync(file, "utf8")));
    expect(offenders.map((file) => path.relative(root, file))).toEqual([]);
  });
});
