import { withSentryConfig } from "@sentry/nextjs";
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
  serverExternalPackages: ["@prisma/client", "@fireblocks/ts-sdk"],
  // Drop only safe-to-exclude bloat: wrong-platform Prisma binary (darwin),
  // build-time schema-engine, and the SWC/esbuild compilers. DO NOT exclude
  // `@prisma/engines/**` or `.prisma/client/**` — Prisma resolves the runtime
  // query engine through those paths on Vercel (rhel-openssl-3.0.x.so.node).
  outputFileTracingExcludes: {
    "*": [
      "node_modules/**/libquery_engine-darwin*",
      "node_modules/**/schema-engine-*",
      "node_modules/@swc/core-*/**",
      "node_modules/esbuild/**",
    ],
  },
  // Force the linux Prisma query engine into every serverless function bundle.
  // serverExternalPackages alone isn't enough on Vercel: nft sometimes misses
  // the .node binary that lives under .prisma/client when the import path is
  // dynamic. This explicitly includes the rhel engine so runtime can locate it.
  outputFileTracingIncludes: {
    "*": [
      "node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node",
      "node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node",
    ],
  },
  experimental: {
    optimizePackageImports: [
      "openai",
      // @react-pdf/renderer: tree-shaken here but NOT in serverExternalPackages —
      // adding it there breaks Turbopack (native binary conflict with canvas/pdfkit)
      "@react-pdf/renderer",
      "lucide-react",
    ],
  },
  // standalone only for Docker/self-host packaging; omitted for Vercel (breaks serverless function routing)
  ...(process.env.STANDALONE_BUILD ? { output: "standalone" as const } : {}),
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

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Only emit upload logs in CI — local dev stays silent
  silent: !process.env.CI,
  // Sourcemap upload only runs when SENTRY_AUTH_TOKEN is present (CI); skipped locally
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
