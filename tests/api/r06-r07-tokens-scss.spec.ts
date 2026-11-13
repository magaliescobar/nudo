import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { compileString } from "sass";

const root = path.resolve(__dirname, "../..");
const loadPaths = [path.join(root, "packages/tokens/scss")];

test.describe("R06 · tokens", () => {
  test("los archivos generados están al día con src/tokens.ts", () => {
    const run = spawnSync("pnpm", ["--filter", "@nudo/tokens", "build:check"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(run.status, run.stderr).toBe(0);
  });

  test("cada tema reasigna solo semánticos y tokens de componente, nunca primitivos", () => {
    const css = readFileSync(path.join(root, "packages/tokens/css/tokens.css"), "utf8");
    const themeBlocks = css.split(/:root\[data-theme="[a-z]+"\]/).slice(1);
    expect(themeBlocks).toHaveLength(3);
    for (const block of themeBlocks) {
      const body = block.slice(0, block.indexOf("}"));
      expect(body).not.toMatch(/--p-[a-z0-9-]+:/);
      expect(body).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    }
  });
});

test.describe("R07 · SCSS", () => {
  test("la API compartida `@use 'tokens'` no emite CSS", () => {
    const { css } = compileString("@use 'tokens';", { loadPaths });
    expect(css.trim()).toBe("");
  });

  test("token() rechaza primitivos y nombres inexistentes", () => {
    expect(() =>
      compileString("@use 'tokens'; a { color: tokens.token('p-ink-950'); }", { loadPaths }),
    ).toThrow(/Token desconocido/);
    expect(() =>
      compileString("@use 'tokens'; a { padding: tokens.token('space-huge'); }", { loadPaths }),
    ).toThrow(/Token desconocido/);
  });

  test("importar la capa compartida desde muchos módulos no duplica reglas en el build", () => {
    const chunks = path.join(root, "apps/web/.next/static/chunks");
    test.skip(!existsSync(chunks), "Requiere `pnpm build` (lo corre el webServer de Playwright).");
    const css = readdirSync(chunks)
      .filter((file) => file.endsWith(".css"))
      .map((file) => readFileSync(path.join(chunks, file), "utf8"))
      .join("\n");
    expect(css.match(/--p-ink-950:/g)).toHaveLength(1);
    expect(css.match(/@keyframes nudo-shimmer/g)).toHaveLength(1);
  });
});
