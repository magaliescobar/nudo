import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: { rootDir: "apps/web/" },
    },
  },
  {
    // Los cache handlers se cargan con require.resolve desde next.config: son CommonJS a propósito.
    files: ["apps/web/cache-handlers/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    "docs/templates/**",
  ]),
]);

export default eslintConfig;
