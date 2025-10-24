import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
        destination: '/venues', // Replace with your internal page path
        permanent: false, // Use false for temporary redirects
      },
    ];
  },
};

export default nextConfig;
