// Herramienta interna de invalidación (§3.4, ADR 017). No pública: ver lib/internal-auth.
import { isValidTag } from "@nudo/data/cache/tags";
import { logEvent, resolveRequestId, withRequestContext } from "@nudo/data/observability/context";
import { getRedisStore } from "@nudo/data/redis";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { guardInternal, internalHeaders } from "../../../../lib/internal-auth";

const MAX_TAGS = 200;

/** Body: `{ "tags": ["product:…", "stock:…"] }`. Expira de inmediato (sin esperar TTL). */
export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get("x-request-id"));
  return withRequestContext({ requestId, route: "/api/internal/invalidate" }, async () => {
    const denied = await guardInternal(request);
    if (denied) return denied;

    const body: unknown = await request.json().catch(() => null);
    const tags = (body as { tags?: unknown } | null)?.tags;
    if (
      !Array.isArray(tags) ||
      tags.length === 0 ||
      tags.length > MAX_TAGS ||
      !tags.every((tag): tag is string => typeof tag === "string" && isValidTag(tag))
    ) {
      return NextResponse.json(
        { error: "invalid_tags" },
        { status: 400, headers: internalHeaders },
      );
    }

    const unique = [...new Set(tags)];
    for (const tag of unique) revalidateTag(tag, { expire: 0 });
    logEvent("info", "cache.invalidate", { tags: unique });
    return NextResponse.json(
      { invalidated: unique, at: new Date().toISOString() },
      { headers: internalHeaders },
    );
  });
}

/** Últimas invalidaciones (tag, tipo, instancia, timestamp) — R05. */
export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get("x-request-id"));
  return withRequestContext({ requestId, route: "/api/internal/invalidate" }, async () => {
    const denied = await guardInternal(request);
    if (denied) return denied;
    const log = await getRedisStore().invalidations.recent(100);
    if (!log.ok) {
      return NextResponse.json(
        { error: "redis_unavailable" },
        { status: 503, headers: internalHeaders },
      );
    }
    return NextResponse.json({ invalidations: log.value }, { headers: internalHeaders });
  });
}
