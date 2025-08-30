import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb'
    },
    // Add this to handle FFmpeg
    serverComponentsExternalPackages: ['fluent-ffmpeg']
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.performance = {
        ...config.performance,
        maxAssetSize: 100 * 1024 * 1024,
        maxEntrypointSize: 100 * 1024 * 1024
      };

      // Handle FFmpeg in production
      if (process.env.NODE_ENV === 'production') {
        config.externals.push({
          'fluent-ffmpeg': 'commonjs fluent-ffmpeg'
        });
      }
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