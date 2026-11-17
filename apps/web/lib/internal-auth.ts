// Guardia de los endpoints internos (§3.4, ADR 017): rate limit fail-closed ANTES de comparar
// el secreto (frena fuerza bruta) y comparación en tiempo constante. Equivale a "una acción de
// admin sin sesión falla" (R38) mientras no haya usuarios.
import "server-only";
import { logEvent } from "@nudo/data/observability/context";
import { getRedisStore } from "@nudo/data/redis";
import { type NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

export const internalHeaders = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

function authorized(request: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  // Hash previo: timingSafeEqual exige igual longitud y así no filtra la del secreto.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

function clientAddress(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** `null` si el request puede seguir; si no, la respuesta de rechazo (429/401). */
export async function guardInternal(request: NextRequest): Promise<NextResponse | null> {
  const limit = await getRedisStore().rateLimit("internal", clientAddress(request));
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: internalHeaders });
  }
  if (!authorized(request)) {
    logEvent("warn", "internal.unauthorized");
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: internalHeaders });
  }
  return null;
}
