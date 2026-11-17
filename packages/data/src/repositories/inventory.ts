import type { Inventory } from "@nudo/commerce/catalog";
import type { Db } from "mongodb";
import { collections, toInventory } from "../mongo/collections";

export type StockLine = { readonly sku: string; readonly qty: number };

export function createInventoryRepository(db: Db) {
  const { inventory } = collections(db);

  return {
    async getMany(skus: readonly string[]): Promise<Inventory[]> {
      const docs = await inventory.find({ sku: { $in: [...skus] } }).toArray();
      return docs.map(toInventory);
    },

    /**
     * Descuento atómico (R02): el filtro `available >= qty` y el `$inc` se aplican en una sola
     * operación de documento, así que dos compras concurrentes del último SKU no pueden ganar ambas.
     */
    async decrement(sku: string, qty: number): Promise<boolean> {
      if (!Number.isInteger(qty) || qty <= 0) throw new RangeError(`Cantidad inválida: ${qty}`);
      const result = await inventory.updateOne(
        { sku, available: { $gte: qty } },
        { $inc: { available: -qty }, $currentDate: { updatedAt: true } },
      );
      return result.modifiedCount === 1;
    },

    async increment(sku: string, qty: number): Promise<void> {
      await inventory.updateOne(
        { sku },
        { $inc: { available: qty }, $currentDate: { updatedAt: true } },
      );
    },

    /**
     * Descuenta varias líneas: si alguna no alcanza, devuelve lo ya descontado (compensación)
     * y retorna los SKUs sin stock. Sin transacción: cada línea es atómica por sí misma y la
     * compensación evita sobreventa sin depender de un replica set con transacciones multi-doc.
     */
    async decrementAll(
      lines: readonly StockLine[],
    ): Promise<{ ok: true } | { ok: false; outOfStock: string[] }> {
      const done: StockLine[] = [];
      for (const line of lines) {
        if (await this.decrement(line.sku, line.qty)) {
          done.push(line);
          continue;
        }
        await Promise.all(done.map((d) => this.increment(d.sku, d.qty)));
        return { ok: false, outOfStock: [line.sku] };
      }
      return { ok: true };
    },
  };
}

export type InventoryRepository = ReturnType<typeof createInventoryRepository>;
