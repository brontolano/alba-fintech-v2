import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/adapter-mariadb', 'mariadb'],
  experimental: {
    // Builder Hostinger tidak persist .next/cache antar build;
    // matikan FS cache agar Turbopack tidak baca cache basi (panic globals.css).
    turbopackFileSystemCacheForBuild: false,
  },
  // Fallback webpack (dipakai saat `next build --webpack`): petakan impor
  // gaya NodeNext `./x.js` -> `./x.ts` agar Prisma 7 client (TS-first) ter-resolve.
  // Diabaikan saat build Turbopack.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
};

export default nextConfig;
