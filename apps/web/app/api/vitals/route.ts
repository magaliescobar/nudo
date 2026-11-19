// R35: endpoint propio de RUM. POST recibe beacons de WebVitals (validado +
// rate limit por IP); GET devuelve p75 agregado por métrica×página (dashboard).
import { connection } from "next/server";
import { getRedisStore } from "@nudo/data/redis";

const NAMES = new Set([
  "TTFB",
  "FCP",
  "LCP",
  "INP",
  "CLS",
  "NEXT_JS_HYDRATION",
  "NEXT_JS_ROUTE_CHANGE_TO_RENDER",
]);
const RATINGS = new Set(["good", "needs-improvement", "poor"]);
const MAX_BODY = 2_048;

type Sample = { name: string; value: number; rating: string; page: string; at: number };

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
}

export async function POST(request: Request) {
  const store = getRedisStore();
  const rate = await store.rateLimit("vitals", clientIp(request));
  if (!rate.allowed) return Response.json({ error: "rate-limited" }, { status: 429 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ error: "too-large" }, { status: 400 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "invalid-json" }, { status: 400 });
  }
  const m = body as Record<string, unknown>;
  if (
    typeof m?.name !== "string" ||
    !NAMES.has(m.name) ||
    typeof m.value !== "number" ||
    !Number.isFinite(m.value) ||
    m.value < 0 ||
    typeof m.rating !== "string" ||
    !RATINGS.has(m.rating) ||
    typeof m.page !== "string" ||
    !m.page.startsWith("/") ||
    m.page.length > 200
  ) {
    return Response.json({ error: "invalid-metric" }, { status: 400 });
  }

  const sample: Sample = {
    name: m.name,
    value: m.value,
    rating: m.rating,
    page: m.page,
    at: Date.now(),
  };
  await store.vitals.push(JSON.stringify(sample));
  return new Response(null, { status: 204 });
}

function p75(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(0.75 * sorted.length) - 1)] ?? 0;
}

export async function GET() {
  await connection();
  const store = getRedisStore();
  const result = await store.vitals.list();
  const samples: Sample[] = result.ok
    ? result.value.flatMap((s) => {
        try {
          return [JSON.parse(s) as Sample];
        } catch {
          return [];
        }
      })
    : [];

  const groups = new Map<string, number[]>();
  for (const s of samples) {
    const k = `${s.name}|${s.page}`;
    const arr = groups.get(k) ?? [];
    arr.push(s.value);
    groups.set(k, arr);
  }

  const report = [...groups.entries()]
    .map(([k, values]) => {
      const [name = "", page = ""] = k.split("|");
      return { name, page, n: values.length, p75: p75(values) };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.page.localeCompare(b.page));

  return Response.json({ degraded: !result.ok, samples: samples.length, report });
}
