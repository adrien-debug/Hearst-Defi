import { createReviewModeRoute } from "@hearst/review-mode";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logger } from "@/lib/logger";
import { assertRateLimit, assertBodySize } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createReviewModeRoute({
  prisma,
  requireAdmin,
  logger,
  assertRateLimit,
  assertBodySize,
});

export const GET = handlers.GET;
export const POST = handlers.POST;
