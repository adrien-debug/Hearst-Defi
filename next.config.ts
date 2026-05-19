import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hearst/cockpit-shell"],
  turbopack: {
    resolveAlias: {
      // Privy optional peer deps (Solana ecosystem) — not installed, stub out
      "x402": { browser: "./src/lib/empty-module.ts", default: "./src/lib/empty-module.ts" },
      "@solana-program/system": { browser: "./src/lib/empty-module.ts", default: "./src/lib/empty-module.ts" },
      "@solana-program/token": { browser: "./src/lib/empty-module.ts", default: "./src/lib/empty-module.ts" },
      "@solana-program/token-2022": { browser: "./src/lib/empty-module.ts", default: "./src/lib/empty-module.ts" },
      "@solana-program/memo": { browser: "./src/lib/empty-module.ts", default: "./src/lib/empty-module.ts" },
      "@solana-program/compute-budget": { browser: "./src/lib/empty-module.ts", default: "./src/lib/empty-module.ts" },
      "@solana/kit": { browser: "./src/lib/empty-module.ts", default: "./src/lib/empty-module.ts" },
      "@farcaster/mini-app-solana": { browser: "./src/lib/empty-module.ts", default: "./src/lib/empty-module.ts" },
      "@abstract-foundation/agw-client": { browser: "./src/lib/empty-module.ts", default: "./src/lib/empty-module.ts" },
      "@solana/transaction-confirmation": { browser: "./src/lib/empty-module.ts", default: "./src/lib/empty-module.ts" },
    },
  },
  output: "standalone",
  reactStrictMode: true,
  devIndicators: false,
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
