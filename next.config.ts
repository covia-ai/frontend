import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for top-level await
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    config.target = isServer ? 'node' : ['web', 'es2022'];
    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  
  reactStrictMode: false,
};

export default nextConfig;