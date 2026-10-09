import type { NextConfig } from "next";
import withBundleAnalyzerInit from "@next/bundle-analyzer";

const withBundleAnalyzer = withBundleAnalyzerInit({ enabled: process.env.ANALYZE === "true" });

// Structural CSP directives only: they block framing, <base> hijacking,
// plugins and cross-origin form posts without restricting scripts, so they
// can be enforced now. script-src/connect-src need per-request nonces for
// Next's inline scripts and ship separately (frontend#435).
const contentSecurityPolicy = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Legacy equivalent of frame-ancestors for browsers without CSP 2.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Keeps /auth/callback?token=… out of the Referer on cross-origin requests.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Severs window.opener for cross-origin windows (e.g. a venue opened in a
  // new tab). Sign-in is a full-page redirect, not a popup, so this is safe.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Vercel already sends max-age=63072000; this adds includeSubDomains. It
  // only covers hosts under app.covia.ai, not the rest of *.covia.ai.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

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

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// The analyzer is a webpack plugin, and wrapping the config registers a
// `webpack` hook even when disabled — which a Turbopack build (the default
// since Next 16) refuses to run alongside. Only wrap when analysing; the
// `analyze` script builds with --webpack for that reason.
export default process.env.ANALYZE === "true" ? withBundleAnalyzer(nextConfig) : nextConfig;
