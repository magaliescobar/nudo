import "server-only";
import { randomUUID } from "node:crypto";
import { type CartView, emptyCartView, indexSkus, resolveCart } from "@nudo/commerce/cart";
import type { Cart } from "@nudo/commerce/catalog";
import type { Locale } from "@nudo/i18n/config";
import { cookies } from "next/headers";
import { getRepositories } from "@nudo/data/repositories";
import { getRedisStore } from "@nudo/data/redis";
import { measure } from "@nudo/data/observability/context";

export const cartCookie = "NUDO_CART";

/** Carrito privado: nunca cacheado ni compartido (R15, docs/caching.md). */
export async function getCartId(): Promise<string | null> {
  const store = await cookies();
  return store.get(cartCookie)?.value ?? null;
}

/** Solo para Server Actions/Route Handlers: crea la cookie si no existe. */
export async function ensureCartId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(cartCookie)?.value;
  if (existing) return existing;
  const id = randomUUID();
  store.set(cartCookie, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return id;
}

export async function getCart(cartId: string | null): Promise<Cart | null> {
  if (!cartId) return null;
  const result = await getRedisStore().cart.get(cartId);
  return result.ok ? result.value : null;
}

export async function saveCart(cart: Cart): Promise<boolean> {
  const result = await getRedisStore().cart.save(cart);
  return result.ok;
}

export async function deleteCart(cartId: string): Promise<void> {
  await getRedisStore().cart.delete(cartId);
}

async function loadCartView(cart: Cart | null): Promise<CartView> {
  if (!cart || cart.lines.length === 0) return emptyCartView();
  const repos = await getRepositories();
  const skus = cart.lines.map((line) => line.sku);
  const [products, inventory] = await Promise.all([
    measure("mongo", () => repos.products.findBySkus(skus)),
    measure("mongo", () => repos.inventory.getMany(skus)),
  ]);
  const stock: Record<string, number> = {};
  for (const item of inventory) stock[item.sku] = Math.max(0, item.available - item.reserved);
  return resolveCart(cart, indexSkus(products), stock);
}

/** Vista con precios/stock vigentes. Se usa en carrito, mini-cart y checkout. */
export async function getCartView(cartId: string | null): Promise<CartView> {
  return loadCartView(await getCart(cartId));
}

/** Contador del header: agujero dinámico dentro del shell estático (R15). */
export async function getCartItemCount(): Promise<number> {
  const view = await getCartView(await getCartId());
  return view.itemCount;
}

/** Sku → info vigente (para PDP/agregar): precio y stock del servidor, nunca del cliente. */
export async function getSkuInfo(sku: string) {
  const repos = await getRepositories();
  const [products, inventory] = await Promise.all([
    repos.products.findBySkus([sku]),
    repos.inventory.getMany([sku]),
  ]);
  const index = indexSkus(products);
  const info = index.get(sku);
  if (!info) return null;
  const item = inventory[0];
  const available = item ? Math.max(0, item.available - item.reserved) : 0;
  return { info, available };
}

export type { Cart, CartView };
export { resolveCart } from "@nudo/commerce/cart";
export type { Locale };
