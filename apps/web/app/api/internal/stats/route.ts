// Contadores de la instancia (R05/R20): consultas a Mongo y estado del cache handler.
// Los tests de stampede suman estos contadores entre instancias.
import { instanceId, processCounters } from "@nudo/data/observability/context";
import { connection, type NextRequest, NextResponse } from "next/server";
import { guardInternal, internalHeaders } from "../../../../lib/internal-auth";

export async function GET(request: NextRequest) {
  await connection();
  const denied = await guardInternal(request);
  if (denied) return denied;
  const cache = (globalThis as Record<symbol, unknown>)[Symbol.for("nudo.cache.stats")] ?? null;
  return NextResponse.json(
    { instance: instanceId, counters: processCounters, cache },
    { headers: internalHeaders },
  );
}
