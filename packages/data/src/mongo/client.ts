import "server-only";
import { type Db, MongoClient, type MongoClientOptions } from "mongodb";
import { getServerEnv } from "../env";

/**
 * Pool por instancia (R02). Cada instancia Node mantiene su propio pool:
 * - maxPoolSize 10: con N instancias el cluster ve ≤ 10·N conexiones (M0/M10 aceptan 500/1500).
 *   Las páginas cacheadas casi no consultan; el pico real es checkout + facetas.
 * - minPoolSize 0 + maxIdleTimeMS: no retener conexiones ociosas en instancias frías.
 * - waitQueueTimeoutMS: si el pool está saturado se falla rápido en lugar de encolar sin límite.
 * - serverSelection/connect/socket timeouts explícitos: "Atlas lento" no cuelga la request.
 */
export const mongoOptions = {
  appName: "nudo-web",
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 60_000,
  waitQueueTimeoutMS: 2_000,
  serverSelectionTimeoutMS: 5_000,
  connectTimeoutMS: 5_000,
  socketTimeoutMS: 15_000,
  retryWrites: true,
  retryReads: true,
} as const satisfies MongoClientOptions;

export const databaseName = process.env.MONGODB_DB ?? "nudo";

const globalForMongo = globalThis as typeof globalThis & {
  __nudoMongoClient?: Promise<MongoClient>;
};
let productionClient: Promise<MongoClient> | undefined;

function connect(): Promise<MongoClient> {
  return new MongoClient(getServerEnv().MONGODB_URI, mongoOptions).connect();
}

/**
 * Singleton del cliente. En desarrollo vive en `globalThis` para sobrevivir al HMR
 * (cada recarga de módulo abriría un pool nuevo); en producción, en el scope del módulo.
 */
export function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    globalForMongo.__nudoMongoClient ??= connect();
    return globalForMongo.__nudoMongoClient;
  }
  productionClient ??= connect();
  return productionClient;
}

export async function getDb(): Promise<Db> {
  return (await getMongoClient()).db(databaseName);
}
