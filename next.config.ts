import type { NextConfig } from "next";

const development = process.env.NODE_ENV === "development";
// Inline script/style support preserves Next's static bootstrap and window
// geometry. This is a restrictive resource policy, not a nonce-based XSS policy.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://va.vercel-scripts.com${development ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://frankie-town.vercel.app",
  "font-src 'self'",
  `connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com https://vitals.vercel-analytics.com${development ? " ws: wss:" : ""}`,
  "worker-src 'self'",
].join("; ");

const config: NextConfig = {
  poweredByHeader: false,
  // Every image is already served directly; no component uses next/image.
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000" },
    ] }];
  },
};

export default config;
