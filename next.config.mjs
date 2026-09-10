/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,

  // Output for deployment
  output: 'standalone',

  // Image optimization — nonaktifkan sepenuhnya untuk standalone Hostinger
  images: {
    unoptimized: true,
    remotePatterns: [],
  },

  // Prisma dan bcryptjs tidak perlu di-bundle oleh bundler
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs', 'sharp'],

  // Disable powered-by header
  poweredByHeader: false,

  // Reduce build output
  productionBrowserSourceMaps: false,

  // Turbopack config untuk markdown support
  turbopack: {
    rules: {
      '*.md': {
        loaders: ['raw-loader'],
      },
    },
  },
};

export default nextConfig;
