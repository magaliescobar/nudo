#!/usr/bin/env node
// R34: First Load JS por ruta, medido en vivo contra un server corriendo.
// Turbopack no emite manifiesto ruta→chunks y las rutas `instant=false`
// prerenderizan un shell vacío, así que la métrica honesta es: los <script
// src="/_next/static/chunks/*.js"> del documento servido, con su tamaño.
// Uso: BASE_URL=http://localhost:3100 node scripts/bundle-budget.mjs
//      --write-baseline   guarda la medición en docs/perf/bundle-baseline.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.env.BASE_URL ?? "http://localhost:3100").replace(/\/+$/, "");
const budgetFile = path.join(root, "scripts/bundle-budget.json");
const outArg = process.argv.find((a) => a.startsWith("--out="));
const baselineFile = outArg
  ? path.resolve(root, outArg.slice(6))
  : path.join(root, "docs/perf/bundle-baseline.json");
const writeBaseline = process.argv.includes("--write-baseline");

const chunkRe = /\/_next\/static\/chunks\/[^"']+?\.js/g;

async function getHtml(url) {
  const res = await fetch(url, { redirect: "manual" });
  return { status: res.status, html: await res.text() };
}

// Tamaño de transferencia real: el contenido del chunk comprimido con gzip
// nivel 6, igual que el middleware de Next (verificado con curl).
async function chunkBytes(url) {
  const res = await fetch(url);
  const raw = Buffer.from(await res.arrayBuffer());
  return { raw: raw.length, gzip: gzipSync(raw, { level: 6 }).length };
}

async function firstProductSlug() {
  const res = await fetch(`${base}/api/plp?locale=es`);
  const body = await res.json();
  return body.products[0].slug.es;
}

const pdpSlug = await firstProductSlug();
const routes = {
  home: "/es",
  plp: "/es/c/tops",
  pdp: `/es/p/${pdpSlug}`,
  search: "/es/search?q=remera",
  cart: "/es/cart",
  // checkout/order no se miden: sin sesión redirigen y su JS es el mismo
  // runtime del cliente — el presupuesto crítico es el del catálogo.
};

const results = [];
for (const [route, url] of Object.entries(routes)) {
  const { status, html } = await getHtml(`${base}${url}`);
  if (status !== 200) {
    results.push({ route, error: `HTTP ${status} en ${url}` });
    continue;
  }
  const files = new Set(html.match(chunkRe) ?? []);
  let total = 0;
  let gzip = 0;
  for (const file of files) {
    const size = await chunkBytes(`${base}${file}`);
    total += size.raw;
    gzip += size.gzip;
  }
  results.push({ route, url, firstLoadJs: gzip, rawJs: total, chunks: files.size, files });
}

const budgets = JSON.parse(readFileSync(budgetFile, "utf8"));
const shared = new Set();
const sets = results.filter((r) => !r.error).map((r) => r.files);
let sharedTotal = 0;
if (sets.length > 0) {
  for (const file of sets[0]) {
    if (sets.every((s) => s.has(file))) {
      sharedTotal += (await chunkBytes(`${base}${file}`)).gzip;
      shared.add(file);
    }
  }
}

console.log(`\nFirst Load JS por ruta (chunks del documento, gzip)`);
console.log(
  `compartido por todas: ${(sharedTotal / 1024).toFixed(1)} kB en ${shared.size} chunks\n`,
);
console.log(
  `${"ruta".padEnd(8)} ${"JS".padStart(9)} ${"propio".padStart(9)} ${"budget".padStart(8)}  estado`,
);

let failed = false;
const baseline = { generatedAt: new Date().toISOString(), base, sharedTotal, routes: {} };
for (const r of results) {
  if (r.error) {
    console.log(
      `${r.route.padEnd(8)} ${"—".padStart(9)} ${"—".padStart(9)} ${"—".padStart(8)}  ${r.error}`,
    );
    failed = true;
    continue;
  }
  const own = r.firstLoadJs - sharedTotal;
  const budget = budgets[r.route] ?? null;
  const ok = budget == null || r.firstLoadJs <= budget;
  if (!ok) failed = true;
  baseline.routes[r.route] = {
    url: r.url,
    firstLoadJsGzip: r.firstLoadJs,
    firstLoadJsRaw: r.rawJs,
    ownJsGzip: own,
    chunks: r.chunks,
  };
  console.log(
    `${r.route.padEnd(8)} ${(r.firstLoadJs / 1024).toFixed(1).padStart(7)}k ${(own / 1024).toFixed(1).padStart(7)}k ${budget != null ? `${(budget / 1024).toFixed(0)}k`.padStart(7) : "—".padStart(7)}  ${ok ? "ok" : "EXCEDE"}`,
  );
}

if (writeBaseline) {
  mkdirSync(path.dirname(baselineFile), { recursive: true });
  writeFileSync(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`\nBaseline guardada en ${path.relative(root, baselineFile)}`);
}
if (failed) {
  console.error("\nPresupuesto excedido o ruta faltante.");
  process.exit(1);
}
