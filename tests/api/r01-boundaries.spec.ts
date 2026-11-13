import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// R01 · Las fronteras se verifican automáticamente: cada import prohibido debe fallar.
const root = path.resolve(__dirname, "../..");

type Probe = { filePath: string; code: string };

function restrictedImportErrors(probes: Probe[]): string[][] {
  const run = spawnSync("node", ["scripts/lint-imports.mjs"], {
    cwd: root,
    input: JSON.stringify(probes),
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(run.stderr);
  return (JSON.parse(run.stdout) as Array<{ errors: string[] }>).map((r) => r.errors);
}

const forbidden: Array<[string, Probe]> = [
  ["commerce → react", { filePath: "packages/commerce/src/probe.ts", code: 'import { useState } from "react";' }],
  ["commerce → next", { filePath: "packages/commerce/src/probe.ts", code: 'import { cookies } from "next/headers";' }],
  ["commerce → data", { filePath: "packages/commerce/src/probe.ts", code: 'import { getServerEnv } from "@nudo/data/env";' }],
  ["ui → data", { filePath: "packages/ui/src/atoms/Probe/Probe.tsx", code: 'import { getServerEnv } from "@nudo/data/env";' }],
  ["ui → mongodb", { filePath: "packages/ui/src/molecules/Probe/Probe.tsx", code: 'import { MongoClient } from "mongodb";' }],
  ["ui → redis", { filePath: "packages/ui/src/organisms/Probe/Probe.tsx", code: 'import { createClient } from "redis";' }],
  ["data → ui", { filePath: "packages/data/src/probe.ts", code: 'import { VisuallyHidden } from "@nudo/ui/atoms/VisuallyHidden";' }],
  ["i18n → commerce", { filePath: "packages/i18n/src/probe.ts", code: 'import { money } from "@nudo/commerce/money";' }],
  ["átomo → molécula", { filePath: "packages/ui/src/atoms/Probe/Probe.tsx", code: 'import { Field } from "../../molecules/Field/Field";' }],
  ["átomo → organismo", { filePath: "packages/ui/src/atoms/Probe/Probe.tsx", code: 'import { Header } from "@nudo/ui/organisms/Header";' }],
  ["molécula → organismo", { filePath: "packages/ui/src/molecules/Probe/Probe.tsx", code: 'import { Header } from "../../organisms/Header/Header";' }],
  ["import profundo a src/", { filePath: "apps/web/app/probe.tsx", code: 'import { money } from "@nudo/commerce/src/money";' }],
];

const allowed: Array<[string, Probe]> = [
  ["molécula → átomo", { filePath: "packages/ui/src/molecules/Probe/Probe.tsx", code: 'import { VisuallyHidden } from "../../atoms/VisuallyHidden/VisuallyHidden";' }],
  ["ui → tipos de commerce", { filePath: "packages/ui/src/organisms/Probe/Probe.tsx", code: 'import type { Money } from "@nudo/commerce/money";' }],
  ["web → data", { filePath: "apps/web/app/probe.tsx", code: 'import { getServerEnv } from "@nudo/data/env";' }],
];

test.describe("R01 · fronteras automáticas", () => {
  test("ESLint rechaza cada import prohibido", () => {
    const results = restrictedImportErrors(forbidden.map(([, probe]) => probe));
    forbidden.forEach(([name], i) => {
      expect.soft(results[i], `debería rechazar ${name}`).not.toHaveLength(0);
    });
  });

  test("ESLint permite las dependencias válidas", () => {
    const results = restrictedImportErrors(allowed.map(([, probe]) => probe));
    allowed.forEach(([name], i) => {
      expect.soft(results[i], `debería permitir ${name}`).toHaveLength(0);
    });
  });

  test("un Client Component que importa `@nudo/data` rompe el build (server-only)", () => {
    test.setTimeout(180_000);
    const probeDir = path.join(root, "apps/web/app/r01-probe");
    const distDir = ".next-r01-probe";
    mkdirSync(probeDir, { recursive: true });
    writeFileSync(
      path.join(probeDir, "page.tsx"),
      [
        '"use client";',
        'import { getServerEnv } from "@nudo/data/env";',
        "export default function Probe() {",
        "  return <p>{typeof getServerEnv}</p>;",
        "}",
        "",
      ].join("\n"),
    );
    try {
      const build = spawnSync("pnpm", ["--filter", "@nudo/web", "exec", "next", "build"], {
        cwd: root,
        env: { ...process.env, NEXT_DIST_DIR: distDir },
        encoding: "utf8",
      });
      expect(build.status).not.toBe(0);
      expect(build.stdout + build.stderr).toContain("server-only");
    } finally {
      rmSync(probeDir, { recursive: true, force: true });
      rmSync(path.join(root, "apps/web", distDir), { recursive: true, force: true });
    }
  });
});
