import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // X-Frame-Options is superseded by CSP frame-ancestors below (hub embed)
          // {
          //   key: "X-Frame-Options",
          //   value: "DENY",
          // },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-eval' is required by Next.js 16 Turbopack runtime; cannot be removed without nonce-based CSP
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://telemetry.privy.io",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https: wss:",
              "frame-src https://auth.privy.io",
              "frame-ancestors 'self' http://localhost:4200 http://localhost:4201",
              "font-src 'self' data:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
