import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/adapter-mariadb', 'mariadb'],
};

export default nextConfig;
