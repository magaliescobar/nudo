// Genera los artefactos de tokens desde src/tokens.ts (R06). Reproducible y determinístico.
//   pnpm --filter @nudo/tokens build          → escribe css/tokens.css y scss/_generated.scss
//   pnpm --filter @nudo/tokens build --check  → falla si los archivos generados no están al día
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { breakpoints, component, primitives, semantic, themes } from "../src/tokens";

const root = path.resolve(import.meta.dirname, "..");
const header = "Generado por packages/tokens/scripts/build.ts desde src/tokens.ts. No editar.";

type Entries = Record<string, string>;

const declarations = (entries: Entries, indent: string) =>
  Object.entries(entries)
    .map(([name, value]) => `${indent}--${name}: ${value};`)
    .join("\n");

const primitiveVars = (): Entries =>
  Object.fromEntries(Object.entries(primitives).map(([name, value]) => [`p-${name}`, value]));

const refs = (entries: Record<string, string>, prefix = ""): Entries =>
  Object.fromEntries(
    Object.entries(entries).map(([name, target]) => [name, `var(--${prefix}${target})`]),
  );

function themeVars(theme: { semantic: Entries; component?: Entries }): Entries {
  return { ...refs(theme.semantic, "p-"), ...refs(theme.component ?? {}) };
}

function buildCss(): string {
  const base = { ...primitiveVars(), ...refs(semantic, "p-"), ...refs(component) };
  const dark = themeVars(themes.dark);
  const drop = themeVars(themes.drop);
  return `/* ${header} */
@layer reset, tokens, base, components, utilities;

@layer tokens {
  :root {
${declarations(base, "    ")}
  }

  :root[data-theme="dark"] {
${declarations(dark, "    ")}
  }

  @media (prefers-color-scheme: dark) {
    :root[data-theme="auto"] {
${declarations(dark, "      ")}
    }
  }

  :root[data-theme="drop"] {
${declarations(drop, "    ")}
  }
}
`;
}

function buildScss(): string {
  const names = [...Object.keys(semantic), ...Object.keys(component)];
  const bps = Object.entries(breakpoints).map(([name, value]) => `  "${name}": ${value},`);
  return `// ${header}
// Solo variables Sass: este archivo no emite CSS (R07).

$names: (
${names.map((name) => `  "${name}",`).join("\n")}
);

$breakpoints: (
${bps.join("\n")}
);
`;
}

const outputs: Array<[string, string]> = [
  ["css/tokens.css", buildCss()],
  ["scss/_generated.scss", buildScss()],
];

const check = process.argv.includes("--check");
let stale = false;
for (const [file, content] of outputs) {
  const target = path.join(root, file);
  if (check) {
    let current = "";
    try {
      current = readFileSync(target, "utf8");
    } catch {}
    if (current !== content) {
      console.error(
        `Desactualizado: packages/tokens/${file}. Corré pnpm --filter @nudo/tokens build.`,
      );
      stale = true;
    }
  } else {
    writeFileSync(target, content);
    console.log(`Escrito packages/tokens/${file}`);
  }
}
if (stale) process.exit(1);
