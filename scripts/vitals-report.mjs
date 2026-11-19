#!/usr/bin/env node
// R35: reporte RUM — lee los agregados p75 del endpoint propio /api/vitals y
// opcionalmente guarda el snapshot para comparar corridas.
//   node scripts/vitals-report.mjs [--write]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.env.BASE_URL ?? "http://localhost:3100").replace(/\/+$/, "");

const res = await fetch(`${base}/api/vitals`);
if (!res.ok) {
  console.error(`GET /api/vitals → ${res.status}`);
  process.exit(1);
}
const data = await res.json();

if (data.samples === 0) {
  console.log("Sin muestras RUM todavía — navegá el sitio y reintentá.");
  process.exit(0);
}

const TARGETS = { LCP: 2500, INP: 200, CLS: 0.1, FCP: 1800, TTFB: 800 };
console.log(`\nRUM p75 (n=${data.samples}${data.degraded ? ", Redis degradado" : ""})`);
console.log(
  `${"métrica".padEnd(6)} ${"página".padEnd(24)} ${"n".padStart(4)} ${"p75".padStart(9)}  estado`,
);
for (const r of data.report) {
  const target = TARGETS[r.name];
  const ok = target == null || r.p75 <= target;
  const unit = r.name === "CLS" ? "" : "ms";
  console.log(
    `${r.name.padEnd(6)} ${r.page.padEnd(24)} ${String(r.n).padStart(4)} ${`${r.p75.toFixed(r.name === "CLS" ? 3 : 0)}${unit}`.padStart(9)}  ${ok ? "ok" : "SOBRE"}`,
  );
}

if (process.argv.includes("--write")) {
  const dir = path.join(root, "docs/perf/vitals");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`\nSnapshot guardado en ${path.relative(root, file)}`);
}
