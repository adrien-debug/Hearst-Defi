import "server-only";

import type { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/** Maximum request body size for API routes (1 MB). */
export const MAX_BODY_SIZE_BYTES = 1024 * 1024;

/**
 * Assert that the request body is within the size limit.
 * Call this BEFORE `req.json()` to prevent memory exhaustion from oversized payloads.
 * Throws a clear error if the Content-Length header exceeds the limit.
 */
export async function assertBodySize(req: NextRequest): Promise<void> {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!Number.isNaN(size) && size > MAX_BODY_SIZE_BYTES) {
      throw new Error(
        `Request body too large. Max ${MAX_BODY_SIZE_BYTES} bytes (${MAX_BODY_SIZE_BYTES / 1024 / 1024} MB).`,
      );
    }
  }
  // If no Content-Length is present, we proceed and let req.json() handle it.
  // Vercel has its own ~4.5MB limit at the infrastructure level.
}

/**
 * Sliding-window rate limiter.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL is configured,
 * otherwise falls back to an in-memory Map (single-instance only).
 *
 * Default: 10 requests per 60-second window per identifier.
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 10;

function nowMs(): number {
  return Date.now();
}

/* -------------------------------------------------------------------------- */
/* Redis backend (multi-instance safe)                                       */
/* -------------------------------------------------------------------------- */

let redis: Redis | null = null;

/** Exported for health-check usage. Returns null when Redis is not configured. */
export function getRedis(): Redis | null {
  if (redis) return redis;
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

async function checkRedis(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const client = getRedis();
  if (!client) {
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, resetAt: nowMs() + windowMs };
  }

  const now = nowMs();
  const windowStart = now - windowMs;

  // Remove entries outside the window
  await client.zremrangebyscore(key, 0, windowStart);

  // Count current entries
  const currentCount = await client.zcard(key);

  if (currentCount >= maxRequests) {
    const oldest = await client.zrange(key, 0, 0, { withScores: true });
    const oldestArr = oldest as Array<{ score: number; member: string }>;
    const resetAt = oldestArr.length > 0 ? (oldestArr[0]?.score ?? 0) + windowMs : now + windowMs;
    return { success: false, limit: maxRequests, remaining: 0, resetAt };
  }

  // Add current request
  await client.zadd(key, { score: now, member: `${now}:${Math.random()}` });
  await client.expire(key, Math.ceil(windowMs / 1000) + 1);

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - currentCount - 1,
    resetAt: now + windowMs,
  };
}

/* -------------------------------------------------------------------------- */
/* In-memory backend (single-instance fallback)                              */
/* -------------------------------------------------------------------------- */

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, Bucket>();

function getMemoryBucket(key: string, windowMs: number): Bucket {
  const existing = memoryStore.get(key);
  if (existing && existing.resetAt > nowMs()) {
    return existing;
  }
  const fresh: Bucket = { count: 0, resetAt: nowMs() + windowMs };
  memoryStore.set(key, fresh);
  return fresh;
}

function checkMemory(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const bucket = getMemoryBucket(key, windowMs);
  const remaining = Math.max(0, maxRequests - bucket.count);
  const success = remaining > 0;

  if (success) {
    bucket.count += 1;
  }

  return {
    success,
    limit: maxRequests,
    remaining: success ? remaining - 1 : 0,
    resetAt: bucket.resetAt,
  };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

async function checkRateLimit(
  identifier: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS,
): Promise<RateLimitResult> {
  // E2E shortcut — hard-gated outside production. Lets Playwright exercise
  // the real login form repeatedly without saturating the IP/email buckets
  // (Upstash persists state across spec runs). Refuses in production builds.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_DISABLE_RATE_LIMIT === "1"
  ) {
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests,
      resetAt: nowMs() + windowMs,
    };
  }
  const redisClient = getRedis();
  if (redisClient) {
    return checkRedis(identifier, maxRequests, windowMs);
  }
  return checkMemory(identifier, maxRequests, windowMs);
}

/**
 * Assert-style helper: throws a clear error when the limit is exceeded.
 */
export async function assertRateLimit(
  identifier: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS,
): Promise<void> {
  const result = await checkRateLimit(identifier, maxRequests, windowMs);
  if (!result.success) {
    const retryAfterSec = Math.ceil((result.resetAt - nowMs()) / 1000);
    logger.warn("rate limit exceeded", { identifier, retryAfterSec });
    throw new Error(`Rate limit exceeded. Try again in ${retryAfterSec}s.`);
  }
}
