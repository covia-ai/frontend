import type { NextConfig } from "next";
import withBundleAnalyzerInit from "@next/bundle-analyzer";

const withBundleAnalyzer = withBundleAnalyzerInit({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  transpilePackages: ["react-markdown", "remark-gfm", "rehype-sanitize"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },

  reactStrictMode: true,
};

export default withBundleAnalyzer(nextConfig);
