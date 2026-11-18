import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.join(__dirname, "../..");

// .env.local vive en la raíz del monorepo (ADR 003 §4); en Vercel/Docker no existe.
const rootEnvFile = path.join(workspaceRoot, ".env.local");
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const nextConfig: NextConfig = {
  // Permite builds aislados (p. ej. la sonda R01 de tests/api) sin pisar `.next`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",

  cacheComponents: true,
  partialPrefetching: true,

  // Mismo id en todas las instancias de una build (R04): versiona assets, `'use cache'` y Server Actions.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || undefined,

  // Imagen Docker mínima (R04). Se traza desde la raíz para incluir packages/*.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  outputFileTracingRoot: workspaceRoot,

  // Perfiles de negocio (R20, docs/caching.md). Segundos: stale = router cache del cliente,
  // revalidate = SWR en servidor, expire = máximo servible stale. Los tags invalidan antes.
  cacheLife: {
    // Ficha, galería, precios de lista, categorías: cambian por operación de backoffice (tag).
    catalog: { stale: 300, revalidate: 900, expire: 86_400 },
    // Disponibilidad por SKU: cambia con cada venta; el checkout siempre revalida contra Mongo.
    stock: { stale: 30, revalidate: 30, expire: 300 },
    // Home, banners, textos de campaña.
    editorial: { stale: 900, revalidate: 3_600, expire: 604_800 },
  },

  turbopack: {
    root: workspaceRoot,
  },

  // Paquetes internos que se publican como TypeScript/SCSS fuente (ADR 003 §2).
  transpilePackages: ["@nudo/commerce", "@nudo/data", "@nudo/i18n", "@nudo/tokens", "@nudo/ui"],

  // Permite `@use 'tokens';` desde apps/web y packages/ui sin imports `~` (ADR 003 §3).
  sassOptions: {
    loadPaths: [path.join(workspaceRoot, "packages/tokens/scss")],
  },

  // L1 en memoria + L2 Redis con tags distribuidos (ADR 006).
  cacheHandlers: {
    default: require.resolve("./cache-handlers/nudo-handler.js"),
    remote: require.resolve("./cache-handlers/nudo-handler.js"),
  },

  async headers() {
    // CSP estática y cacheable (ADR 022): sin nonce para no volver dinámica la página.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
    const securityHeaders = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Imágenes locales del seed: nombre determinista por variante, no hasheado.
        source: "/catalog/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
