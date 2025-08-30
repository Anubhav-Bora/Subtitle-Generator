import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Next.js to look in src directory
  pageExtensions: ['ts', 'tsx'],
  
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb'
    }
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.performance = {
        ...config.performance,
        maxAssetSize: 100 * 1024 * 1024, 
        maxEntrypointSize: 100 * 1024 * 1024 
      };
    }
    return config;
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      }
    ];
  }
};

export default nextConfig;