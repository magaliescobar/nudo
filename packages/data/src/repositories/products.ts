import type { Product } from "@nudo/commerce/catalog";
import type { Locale } from "@nudo/i18n/config";
import { type Db, ObjectId } from "mongodb";
import { collections, toProduct } from "../mongo/collections";

export function createProductRepository(db: Db) {
  const { products } = collections(db);

  return {
    /** PDP: activo o discontinuado (este último se muestra sin compra, ADR 013). */
    async findBySlug(locale: Locale, slug: string): Promise<Product | null> {
      const doc = await products.findOne({
        [`slug.${locale}`]: slug,
        status: { $in: ["active", "discontinued"] },
      });
      return doc ? toProduct(doc) : null;
    },

    async findById(id: string): Promise<Product | null> {
      if (!ObjectId.isValid(id)) return null;
      const doc = await products.findOne({ _id: new ObjectId(id) });
      return doc ? toProduct(doc) : null;
    },

    /** Productos que contienen los SKUs dados (carrito, pedido). */
    async findBySkus(skus: readonly string[]): Promise<Product[]> {
      const docs = await products.find({ "variants.skus.sku": { $in: [...skus] } }).toArray();
      return docs.map(toProduct);
    },

    async listActiveByCategory(categoryId: string, limit = 24): Promise<Product[]> {
      if (!ObjectId.isValid(categoryId)) return [];
      const docs = await products
        .find({ status: "active", categoryIds: new ObjectId(categoryId) })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .toArray();
      return docs.map(toProduct);
    },
  };
}

export type ProductRepository = ReturnType<typeof createProductRepository>;
