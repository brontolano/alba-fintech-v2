/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,

  // Output mode standalone untuk Hostinger
  output: 'standalone',

  // Disable powered-by header
  poweredByHeader: false,

  // Kurangi ukuran build
  productionBrowserSourceMaps: false,

  // Image optimization
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Prisma dan bcryptjs tidak boleh di-bundle webpack (harus jalan di Node.js runtime)
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs', 'sharp'],

  // Bundle configuration
  webpack: (config) => {
    // Markdown support
    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader',
    });
    return config;
  },
};

export default nextConfig;
