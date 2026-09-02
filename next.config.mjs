/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  
  // Image optimization
  images: {
    domains: ['localhost', 'alba-fintech.vercel.app', 'lh3.googleusercontent.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Bundle configuration
  webpack: (config) => {
    // Add markdown support
    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader',
    });
    
    return config;
  },
  
  // Output for deployment
  output: 'standalone',
  
  // Disable powered-by header
  poweredByHeader: false,
  
  // Reduce build output
  productionBrowserSourceMaps: false,
};

export default nextConfig;