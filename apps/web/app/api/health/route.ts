import { instanceId } from "@nudo/data/observability/context";
import { connection, NextResponse } from "next/server";

// Liveness para Docker/nginx: no toca Mongo ni Redis (una caída de Redis no debe sacar instancias).
// `connection()` evita el prerender: la instancia se resuelve en cada request, no en el build.
export async function GET() {
  await connection();
  return NextResponse.json(
    { ok: true, instance: instanceId },
    { headers: { "Cache-Control": "no-store" } },
  );
}
