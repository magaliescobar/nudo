// Herramienta interna de catálogo (§3.4, ADR 017): muta Mongo y dispara la invalidación exacta
// vía `POST /api/internal/invalidate`. Uso (desde la raíz):
//   pnpm catalog:set-price  <productId> <centavos>
//   pnpm catalog:set-stock  <sku> <disponible>
//   pnpm catalog:rename     <productId> <es|en> <nombre…>
//   pnpm catalog:set-status <productId> <draft|active|discontinued>
//   pnpm catalog:set-slug   <productId> <es|en> <slug>
//   pnpm catalog:invalidate <tag> [tag…]
// Destino: CATALOG_INVALIDATE_URL (o NEXT_PUBLIC_SITE_URL). Secreto: INTERNAL_API_SECRET.
import { existsSync } from "node:fs";
import path from "node:path";
import { isLocale, type Locale } from "@nudo/i18n/config";
import { MongoClient } from "mongodb";
import { type CatalogMutation, tagsForMutation } from "../src/cache/tags";
import { createCatalogAdminRepository, isProductStatus } from "../src/repositories/catalog-admin";

const root = path.resolve(import.meta.dirname, "../../..");
const envFile = path.join(root, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

function fail(message: string): never {
  console.error(`catalog: ${message}`);
  process.exit(1);
}

function databaseName(uri: string): string {
  if (process.env.MONGODB_DB) return process.env.MONGODB_DB;
  const pathname = new URL(uri.replace(/^mongodb(\+srv)?:/, "http:")).pathname.slice(1);
  return pathname || "nudo";
}

function localeArg(value: string | undefined): Locale {
  if (!value || !isLocale(value)) fail(`locale inválido: ${value ?? "(vacío)"}`);
  return value;
}

async function invalidate(tags: string[]) {
  const base = process.env.CATALOG_INVALIDATE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!base || !secret)
    fail("faltan CATALOG_INVALIDATE_URL/NEXT_PUBLIC_SITE_URL o INTERNAL_API_SECRET");
  const response = await fetch(new URL("/api/internal/invalidate", base), {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ tags }),
  });
  if (!response.ok) {
    fail(
      `invalidación rechazada (${response.status}). Los datos cambiaron: reintentá con ` +
        `pnpm catalog:invalidate ${tags.join(" ")}`,
    );
  }
  console.log(JSON.stringify(await response.json()));
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "invalidate") {
    if (args.length === 0) fail("indicá al menos un tag");
    return invalidate(args);
  }

  const uri = process.env.MONGODB_URI ?? fail("falta MONGODB_URI");
  const client = await new MongoClient(uri).connect();
  try {
    const admin = createCatalogAdminRepository(client.db(databaseName(uri)));
    let mutation: CatalogMutation;

    switch (command) {
      case "set-price": {
        const [productId = "", cents = ""] = args;
        const result = await admin.setPrice(productId, Number(cents));
        if (!result) fail(`producto inexistente: ${productId}`);
        mutation = { kind: "price", ...result };
        break;
      }
      case "set-stock": {
        const [sku = "", available = ""] = args;
        const result = await admin.setStock(sku, Number(available));
        if (!result) fail(`SKU inexistente: ${sku}`);
        mutation = { kind: "stock", skus: result.skus };
        break;
      }
      case "rename": {
        const [productId = "", locale, ...name] = args;
        if (name.length === 0) fail("indicá el nombre");
        const result = await admin.rename(productId, localeArg(locale), name.join(" "));
        if (!result) fail(`producto inexistente: ${productId}`);
        mutation = { kind: "rename", ...result };
        break;
      }
      case "set-status": {
        const [productId = "", status = ""] = args;
        if (!isProductStatus(status)) fail(`estado inválido: ${status}`);
        const result = await admin.setStatus(productId, status);
        if (!result) fail(`producto inexistente: ${productId}`);
        mutation = { kind: "status", ...result };
        break;
      }
      case "set-slug": {
        const [productId = "", locale, slug = ""] = args;
        const result = await admin.setSlug(productId, localeArg(locale), slug);
        if (!result) fail(`producto inexistente: ${productId}`);
        mutation = { kind: "slug", ...result };
        break;
      }
      default:
        fail(`comando desconocido: ${command ?? "(vacío)"}`);
    }

    await invalidate(tagsForMutation(mutation));
  } finally {
    await client.close();
  }
}

await main();
