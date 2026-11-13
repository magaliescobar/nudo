import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,

  cacheHandlers: {
        default: require.resolve('./cache-handlers/redis-handler.js'),
        remote: require.resolve('./cache-handlers/redis-handler.js'),
    },
};

export default nextConfig;
