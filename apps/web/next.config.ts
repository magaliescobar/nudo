import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.join(__dirname, "../..");

// .env.local vive en la raíz del monorepo (ADR 003 §4); en Vercel/Docker no existe.
const rootEnvFile = path.join(workspaceRoot, ".env.local");
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  turbopack: {
    root: workspaceRoot,
  },

  cacheHandlers: {
    default: require.resolve("./cache-handlers/redis-handler.js"),
    remote: require.resolve("./cache-handlers/redis-handler.js"),
  },
};

export default nextConfig;
