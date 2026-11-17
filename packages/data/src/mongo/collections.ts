// Documentos tal como se guardan en Atlas y su conversión a tipos de dominio.
// Sin `server-only` a propósito: lo usan scripts (seed, índices) y tests fuera de Next.
import type {
  Category,
  Inventory,
  Order,
  Product,
  Redirect,
  Variant,
} from "@nudo/commerce/catalog";
import type { Db, ObjectId } from "mongodb";

export const collectionNames = {
  products: "products",
  inventory: "inventory",
  categories: "categories",
  orders: "orders",
  redirects: "redirects",
} as const;

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export type ProductDoc = Omit<Mutable<Product>, "id" | "categoryIds" | "variants"> & {
  _id: ObjectId;
  categoryIds: ObjectId[];
  variants: Variant[];
  /** Denormalizado para facetas/búsqueda (ADR 009); lo mantiene el seed y la confirmación de pedidos. */
  search: {
    colors: string[];
    sizes: string[];
    minPrice: number;
    maxPrice: number;
    inStock: boolean;
  };
};

export type InventoryDoc = Mutable<Inventory> & { _id?: ObjectId };

export type CategoryDoc = Omit<Mutable<Category>, "id" | "parentId" | "path"> & {
  _id: ObjectId;
  parentId?: ObjectId;
  path: ObjectId[];
};

export type OrderDoc = Omit<Mutable<Order>, "id"> & { _id: ObjectId };

export type RedirectDoc = Mutable<Redirect> & { _id?: ObjectId };

export function collections(db: Db) {
  return {
    products: db.collection<ProductDoc>(collectionNames.products),
    inventory: db.collection<InventoryDoc>(collectionNames.inventory),
    categories: db.collection<CategoryDoc>(collectionNames.categories),
    orders: db.collection<OrderDoc>(collectionNames.orders),
    redirects: db.collection<RedirectDoc>(collectionNames.redirects),
  };
}

export function toProduct({ _id, categoryIds, search: _search, ...doc }: ProductDoc): Product {
  return { ...doc, id: _id.toHexString(), categoryIds: categoryIds.map((id) => id.toHexString()) };
}

export function toCategory({ _id, parentId, path, ...doc }: CategoryDoc): Category {
  return {
    ...doc,
    id: _id.toHexString(),
    path: path.map((id) => id.toHexString()),
    ...(parentId ? { parentId: parentId.toHexString() } : {}),
  };
}

export function toInventory({ _id: _ignored, ...doc }: InventoryDoc): Inventory {
  return doc;
}

export function toOrder({ _id, ...doc }: OrderDoc): Order {
  return { ...doc, id: _id.toHexString() };
}

export function toRedirect({ from, to, status }: RedirectDoc): Redirect {
  return { from, to, status };
}
