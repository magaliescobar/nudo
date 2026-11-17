import "server-only";
import { getDb } from "./mongo/client";
import { createCategoryRepository } from "./repositories/categories";
import { createInventoryRepository } from "./repositories/inventory";
import { createOrderRepository } from "./repositories/orders";
import { createProductRepository } from "./repositories/products";
import { createRedirectRepository } from "./repositories/redirects";

/** Repositorios ligados al cliente singleton. Punto de entrada para Server Components y Actions. */
export async function getRepositories() {
  const db = await getDb();
  return {
    products: createProductRepository(db),
    inventory: createInventoryRepository(db),
    categories: createCategoryRepository(db),
    orders: createOrderRepository(db),
    redirects: createRedirectRepository(db),
  };
}
