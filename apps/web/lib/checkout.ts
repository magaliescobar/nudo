import "server-only";
import type { CheckoutSession } from "@nudo/commerce/catalog";
import { randomUUID } from "node:crypto";
import { getRedisStore } from "@nudo/data/redis";

export async function getCheckoutSession(cartId: string | null): Promise<CheckoutSession | null> {
  if (!cartId) return null;
  const result = await getRedisStore().checkout.get(cartId);
  return result.ok ? result.value : null;
}

/** Sesión nueva con idempotency key generada ANTES de mostrar el botón de confirmar (R16). */
export async function ensureCheckoutSession(cartId: string): Promise<CheckoutSession> {
  const existing = await getCheckoutSession(cartId);
  if (existing) return existing;
  const session: CheckoutSession = {
    cartId,
    step: "contact",
    idempotencyKey: randomUUID(),
  };
  await getRedisStore().checkout.save(session);
  return session;
}

export async function saveCheckoutSession(session: CheckoutSession): Promise<boolean> {
  const result = await getRedisStore().checkout.save(session);
  return result.ok;
}

export async function deleteCheckoutSession(cartId: string): Promise<void> {
  await getRedisStore().checkout.delete(cartId);
}
