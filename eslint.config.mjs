import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ---------------------------------------------------------------------------
// Fronteras entre paquetes (R01) y composición Atomic Design (R08, §3.5).
// Un import prohibido es un error de lint: `pnpm lint` falla.
// Prueba automática: tests/api/r01-boundaries.spec.ts
// ---------------------------------------------------------------------------

const ui = ["@nudo/ui", "@nudo/ui/*"];
const data = ["@nudo/data", "@nudo/data/*"];
const web = ["@nudo/web", "@nudo/web/*"];
const tokensTs = ["@nudo/tokens", "@nudo/tokens/*"];
const commerce = ["@nudo/commerce", "@nudo/commerce/*"];
const react = ["react", "react/*", "react-dom", "react-dom/*"];
const next = ["next", "next/*", "@next/*"];
const storage = ["mongodb", "mongodb/*", "redis", "redis/*", "ioredis", "@upstash/*"];

/** Patrones válidos en todo el monorepo: solo se importa por subpath exports. */
const commonPatterns = [
  {
    group: ["@nudo/*/src", "@nudo/*/src/*"],
    message: "Importá por los subpath exports del paquete (package.json#exports), no desde src/.",
  },
];

/**
 * Arma la regla no-restricted-imports para un grupo de archivos.
 * En flat config la última regla gana (no se fusionan), por eso cada bloque repite los patrones comunes.
 */
function boundary(files, forbidden, message, extraPatterns = []) {
  return {
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...commonPatterns,
            ...(forbidden.length ? [{ group: forbidden, message }] : []),
            ...extraPatterns,
          ],
        },
      ],
    },
  };
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "apps/web/" },
    },
  },

  boundary(["**/*.{ts,tsx,mts,js,mjs}"], [], ""),

  boundary(
    ["packages/commerce/**"],
    [...ui, ...data, ...web, ...tokensTs, ...react, ...next, ...storage],
    "R01: `commerce` es dominio puro: no conoce React, Next, UI ni almacenamiento.",
  ),
  boundary(
    ["packages/i18n/**"],
    [...ui, ...data, ...web, ...commerce, ...tokensTs, ...next, ...storage],
    "R01: `i18n` solo define locales, diccionarios y formato; no depende de otros paquetes.",
  ),
  boundary(
    ["packages/data/**"],
    [...ui, ...web, ...tokensTs, ...react, ...next],
    "R01: `data` es server-only y no conoce la UI ni Next.",
  ),

  // ui: sin Atlas/Redis ni data, y regla de composición atómica.
  boundary(
    ["packages/ui/src/atoms/**"],
    [...data, ...web, ...storage],
    "R01: `ui` no conoce Atlas, Redis ni `data`.",
    [
      {
        group: [
          "**/molecules/**",
          "**/organisms/**",
          "@nudo/ui/molecules/*",
          "@nudo/ui/organisms/*",
        ],
        message: "Atomic Design: un átomo no importa moléculas ni organismos.",
      },
    ],
  ),
  boundary(
    ["packages/ui/src/molecules/**"],
    [...data, ...web, ...storage],
    "R01: `ui` no conoce Atlas, Redis ni `data`.",
    [
      {
        group: ["**/organisms/**", "@nudo/ui/organisms/*"],
        message: "Atomic Design: una molécula no importa organismos.",
      },
    ],
  ),
  boundary(
    ["packages/ui/src/organisms/**", "packages/ui/src/*.{ts,tsx}"],
    [...data, ...web, ...storage],
    "R01: `ui` no conoce Atlas, Redis ni `data`.",
  ),

  {
    // Descartar campos con rest (`{ _id, ...doc }`) es intencional; `_` marca parámetros sin uso.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  {
    // Los cache handlers se cargan con require.resolve desde next.config: son CommonJS a propósito.
    files: ["apps/web/cache-handlers/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([
    "**/.next/**",
    "**/.next-*/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    "docs/templates/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
