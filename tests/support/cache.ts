// Utilidades de los tests de caché (R04/R05/R20): datos del seed, Server-Timing y endpoints internos.
import { existsSync } from "node:fs";
import path from "node:path";
import type { APIRequestContext, APIResponse } from "@playwright/test";
import { type Db, MongoClient } from "mongodb";

const envFile = path.join(process.cwd(), ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const hasCacheEnv = Boolean(process.env.MONGODB_URI && process.env.INTERNAL_API_SECRET);

export function auth(): Record<string, string> {
  return { authorization: `Bearer ${process.env.INTERNAL_API_SECRET ?? ""}` };
}

function databaseName(uri: string): string {
  if (process.env.MONGODB_DB) return process.env.MONGODB_DB;
  return new URL(uri.replace(/^mongodb(\+srv)?:/, "http:")).pathname.slice(1) || "nudo";
}

export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const uri = process.env.MONGODB_URI as string;
  const client = await new MongoClient(uri).connect();
  try {
    return await fn(client.db(databaseName(uri)));
  } finally {
    await client.close();
  }
}

export type SampleProduct = { id: string; skus: string[]; nameEs: string };

/** Producto activo del seed (distinto `index` por spec para no compartir claves entre tests). */
export function sampleProduct(index: number): Promise<SampleProduct> {
  return withDb(async (db) => {
    const [doc] = await db
      .collection("products")
      .find({ status: "active" })
      .sort({ _id: 1 })
      .skip(index)
      .limit(1)
      .toArray();
    if (!doc) throw new Error("Sin productos: corré pnpm db:seed");
    return {
      id: doc._id.toHexString(),
      skus: doc.variants.flatMap((v: { skus: { sku: string }[] }) => v.skus.map((s) => s.sku)),
      nameEs: doc.name.es,
    };
  });
}

export function productTags(product: SampleProduct): string[] {
  return [`product:${product.id}`, ...product.skus.map((sku) => `stock:${sku}`)];
}

export type CacheTiming = { status: string; hit: number; miss: number; stale: number };

export function cacheTiming(response: APIResponse): CacheTiming {
  const header = response.headers()["server-timing"] ?? "";
  const match = /cache;desc="(\w+) \(hit=(\d+) miss=(\d+) stale=(\d+)\)"/.exec(header);
  if (!match) throw new Error(`Server-Timing sin estado de caché: ${header}`);
  return {
    status: match[1]!,
    hit: Number(match[2]),
    miss: Number(match[3]),
    stale: Number(match[4]),
  };
}

export async function invalidate(
  request: APIRequestContext,
  tags: string[],
  headers: Record<string, string> = {},
) {
  const response = await request.post("/api/internal/invalidate", {
    headers: { ...auth(), ...headers },
    data: { tags },
  });
  if (!response.ok()) throw new Error(`invalidate → ${response.status()}`);
  return response.json();
}

export async function mongoQueries(
  request: APIRequestContext,
  headers: Record<string, string> = {},
): Promise<number> {
  const response = await request.get("/api/internal/stats", { headers: { ...auth(), ...headers } });
  if (!response.ok()) throw new Error(`stats → ${response.status()}`);
  const body = (await response.json()) as { counters: Record<string, number> };
  return body.counters.mongo ?? 0;
}
