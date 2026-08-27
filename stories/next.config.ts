import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Allows the dev server's HMR/asset requests when reviewing over the LAN
  // (e.g. a phone hitting this machine's local IP) instead of localhost.
  // Dev-only setting — irrelevant in production.
  allowedDevOrigins: ['192.168.4.32'],
  async headers() {
    // The 1-year immutable cache is right for production (carts/engine
    // files change rarely, and the loader's `?t=` query-busts stale ones),
    // but it actively fights local iteration: some caching layers are
    // inconsistent about honoring a new query string against an
    // `immutable` directive, which can make a just-rebuilt cart look like
    // it never changed. Dev gets no-cache instead, so a rebuilt file is
    // never in question while actively testing changes.
    const assetCacheControl = process.env.NODE_ENV === 'production'
      ? 'public, max-age=31536000, immutable'
      : 'no-cache, no-store, must-revalidate';
    return [
      {
        source: '/carts/:path*',
        headers: [{ key: 'Cache-Control', value: assetCacheControl }],
      },
      {
        source: '/nova64/:path*',
        headers: [{ key: 'Cache-Control', value: assetCacheControl }],
      },
      {
        source: '/api/experience/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
