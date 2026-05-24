import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getRedis, assertRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: { status: "pass" | "fail"; latencyMs: number };
    redis?: { status: "pass" | "fail"; latencyMs: number };
  };
  timestamp: string;
}

/**
 * Health check endpoint for orchestrators (Railway, K8s, Docker Compose).
 *
 * Checks:
 *   - Database: lightweight SELECT 1 query
 *   - Redis: PING (optional — app works with in-memory fallback)
 *
 * HTTP codes:
 *   200 — all critical checks pass
 *   503 — database is down (unhealthy)
 *
 * Redis failure returns 200 with "degraded" status because the app
 * falls back to in-memory rate limiting.
 */
export async function GET(): Promise<NextResponse> {
  await assertRateLimit("health:global", 60, 60_000);

  const checks: HealthCheck["checks"] = {
    database: { status: "fail", latencyMs: 0 },
  };
  let status: HealthCheck["status"] = "healthy";

  // DB check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "pass", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: "fail", latencyMs: Date.now() - dbStart };
    status = "unhealthy";
  }

  // Redis check (optional — app works without Redis in dev)
  const redis = getRedis();
  if (redis) {
    const redisStart = Date.now();
    try {
      await redis.ping();
      checks.redis = { status: "pass", latencyMs: Date.now() - redisStart };
    } catch {
      checks.redis = { status: "fail", latencyMs: Date.now() - redisStart };
      status = "degraded"; // Redis down ≠ app down (fallback in-memory)
    }
  }

  const response: HealthCheck = {
    status,
    checks,
    timestamp: new Date().toISOString(),
  };

  const statusCode = status === "unhealthy" ? 503 : 200;
  return NextResponse.json(response, { status: statusCode });
}
