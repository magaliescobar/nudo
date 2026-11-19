#!/usr/bin/env node
// R35: Lighthouse lab por locale — home/PLP/PDP en es+en, guarda JSONs y
// compara contra la corrida anterior (mismo set de URLs).
//   node scripts/lighthouse.mjs   (requiere Chrome/Chromium en el host)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.env.BASE_URL ?? "http://localhost:3100").replace(/\/+$/, "");
const outDir = path.join(root, "docs/perf/lighthouse");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
mkdirSync(outDir, { recursive: true });

const urls = [
  ["home-es", `${base}/es`],
  ["home-en", `${base}/en`],
  ["plp-es", `${base}/es/c/tops`],
  ["plp-en", `${base}/en/c/tops`],
  ["pdp-es", `${base}/es/p/buzo-neon-tecnica-049`],
  ["pdp-en", `${base}/en/p/neon-tech-sweatshirt-049`],
];

// Corrida anterior (más reciente distinta de esta).
const prevRuns = [...new Set(readdirSync(outDir).map((f) => f.split("__")[0]))]
  .sort()
  .filter((s) => s < stamp);
const prev = prevRuns.at(-1);

function readReport(file) {
  try {
    const lhr = JSON.parse(readFileSync(file, "utf8"));
    const audits = lhr.audits;
    return {
      perf: Math.round((lhr.categories?.performance?.score ?? 0) * 100),
      lcp: audits["largest-contentful-paint"]?.numericValue,
      inp: audits["interaction-to-next-paint"]?.numericValue,
      cls: audits["cumulative-layout-shift"]?.numericValue,
    };
  } catch {
    return null;
  }
}

console.log(`Lighthouse vs ${base}${prev ? ` (comparando con ${prev})` : ""}\n`);
console.log(
  `${"página".padEnd(9)} ${"perf".padStart(5)} ${"LCP".padStart(7)} ${"INP".padStart(6)} ${"CLS".padStart(6)}` +
    (prev ? `${"  Δperf".padStart(7)} ${"ΔLCP".padStart(7)}` : ""),
);

for (const [name, url] of urls) {
  const file = path.join(outDir, `${stamp}__${name}.json`);
  try {
    execFileSync(
      "npx",
      [
        "--yes",
        "lighthouse",
        url,
        "--output=json",
        `--output-path=${file}`,
        "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage",
        "--only-categories=performance",
        "--quiet",
      ],
      { stdio: "pipe", timeout: 120_000 },
    );
  } catch (error) {
    console.log(`${name.padEnd(9)}  FALLO: ${String(error).slice(0, 80)}`);
    continue;
  }
  const cur = readReport(file);
  const prevFile = prev && path.join(outDir, `${prev}__${name}.json`);
  const old = prevFile && existsSync(prevFile) ? readReport(prevFile) : null;
  const fmt = (v, d = 0) => (v == null ? "-" : v.toFixed(d));
  console.log(
    `${name.padEnd(9)} ${String(cur?.perf ?? "-").padStart(5)} ${`${fmt(cur?.lcp)}ms`.padStart(7)} ${`${fmt(cur?.inp)}ms`.padStart(6)} ${fmt(cur?.cls, 3).padStart(6)}` +
      (prev
        ? `  ${old ? `${cur.perf - old.perf}`.padStart(5) : "-".padStart(5)} ${old ? `${Math.round(cur.lcp - old.lcp)}ms`.padStart(7) : "-".padStart(7)}`
        : ""),
  );
}

// Manifiesto con el diff resumen (para CI/diff).
const summary = { stamp, base, prev, pages: {} };
for (const [name] of urls) {
  const cur = readReport(path.join(outDir, `${stamp}__${name}.json`));
  if (cur) summary.pages[name] = cur;
}
writeFileSync(path.join(outDir, `${stamp}__summary.json`), JSON.stringify(summary, null, 2));
console.log(`\nReportes en ${path.relative(root, outDir)}/`);
