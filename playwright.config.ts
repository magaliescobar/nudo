import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3100);
const baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;

/**
 * Proyectos (§3.6):
 * - chromium: UI y accesibilidad en escritorio.
 * - mobile:   UI en viewport móvil (motor Chromium).
 * - no-js:    UI sin JavaScript (R36: flujos críticos deben funcionar con HTML).
 * - api:      Route Handlers, fronteras y contratos HTTP, sin navegador.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testMatch: /(ui|a11y)\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: /ui\/.*\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "no-js",
      testMatch: /ui\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], javaScriptEnabled: false },
    },
    {
      name: "api",
      testMatch: /api\/.*\.spec\.ts/,
    },
  ],
  // Se prueba contra el build de producción: el comportamiento de caché de dev no es representativo.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm --filter @nudo/web exec next start -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});
