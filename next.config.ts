import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for top-level await
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    return config;
  },
  
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
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
  
  async redirects() {
    return [
      {
        source: '/',
        destination: '/workspace',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;