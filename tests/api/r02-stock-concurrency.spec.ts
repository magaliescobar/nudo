import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { MongoClient } from "mongodb";
import { createInventoryRepository } from "../../packages/data/src/repositories/inventory";

const envFile = path.resolve(__dirname, "../../.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

test.describe("R02 · stock atómico", () => {
  test.skip(!process.env.MONGODB_URI, "Requiere MONGODB_URI (.env.local).");

  test("50 compras simultáneas del último SKU → exactamente una venta", async () => {
    const client = await new MongoClient(process.env.MONGODB_URI as string).connect();
    const db = client.db(`${process.env.MONGODB_DB ?? "nudo"}_test`);
    const sku = `TEST-LAST-${Date.now()}`;
    try {
      await db
        .collection("inventory")
        .insertOne({ sku, available: 1, reserved: 0, updatedAt: new Date() });
      const inventory = createInventoryRepository(db);

      const results = await Promise.all(
        Array.from({ length: 50 }, () => inventory.decrement(sku, 1)),
      );

      expect(results.filter(Boolean)).toHaveLength(1);
      const [final] = await inventory.getMany([sku]);
      expect(final?.available).toBe(0);
    } finally {
      await db.collection("inventory").deleteMany({ sku });
      await client.close();
    }
  });
});
