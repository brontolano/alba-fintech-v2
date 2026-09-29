import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/adapter-mariadb', 'mariadb'],
  experimental: {
    // Builder Hostinger tidak persist .next/cache antar build;
    // matikan FS cache agar Turbopack tidak baca cache basi (panic globals.css).
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
