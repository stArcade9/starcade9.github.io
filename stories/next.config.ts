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
    return [
      {
        source: '/carts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/nova64/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/api/experience/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
