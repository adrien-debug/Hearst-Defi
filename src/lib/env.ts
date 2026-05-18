import "server-only";

import { z } from "zod";

/**
 * Server-side environment validation.
 *
 * Every variable consumed by the server MUST be declared here. The module
 * crashes at import time if a required variable is missing or malformed,
 * preventing silent runtime failures.
 *
 * NEXT_PUBLIC_* variables are NOT validated here — they are build-time
 * injected by Next.js and may be read from the client bundle. Keep secrets
 * out of them.
 */

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ANTHROPIC_API_KEY: z
    .string()
    .min(1)
    .startsWith("sk-ant", "ANTHROPIC_API_KEY must start with sk-ant")
    .optional(),
  PRIVY_APP_SECRET: z.string().optional(),
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().optional(),
  NEXT_PUBLIC_CHAIN_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_EVENT_LOGGER_ADDRESS: z.string().optional(),
  NEXT_PUBLIC_POR_REGISTRY_ADDRESS: z.string().optional(),
  ADMIN_ADDRESSES: z.string().optional(),
  HEARST_PUBLISHER: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const fieldErrors = parsed.error.flatten().fieldErrors;
  // In test mode we only warn — many test runners stub env late.
  if (process.env.NODE_ENV !== "test") {
    console.error(
      "❌ Invalid environment variables:\n",
      JSON.stringify(fieldErrors, null, 2),
    );
    throw new Error(
      `Invalid environment variables: ${Object.keys(fieldErrors).join(", ")}`,
    );
  }
}

// Production safety guards — fail fast at runtime, skip during `next build`
// NEXT_PHASE is "phase-production-build" during pnpm build; we only want to
// enforce these at server startup time, not build time.
const IS_RUNTIME_PRODUCTION =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build";

if (IS_RUNTIME_PRODUCTION && parsed.success) {
  const d = parsed.data;
  if (!d.PRIVY_APP_SECRET || !d.NEXT_PUBLIC_PRIVY_APP_ID) {
    throw new Error(
      "PRIVY_APP_SECRET and NEXT_PUBLIC_PRIVY_APP_ID are required in production. " +
        "Without them, the auth gate is completely disabled and all routes are open.",
    );
  }
  if (!d.INNGEST_SIGNING_KEY) {
    throw new Error(
      "INNGEST_SIGNING_KEY is required in production. " +
        "Without it, /api/inngest accepts unauthenticated requests — anyone can trigger " +
        "background jobs (mining health, investor memo) and rack up LLM costs.",
    );
  }
  if (!d.ANTHROPIC_API_KEY) {
    console.error(
      "⚠️  ANTHROPIC_API_KEY is not set. LLM features (agents, investor memo) will " +
        "fail at runtime. Set ANTHROPIC_API_KEY to enable them.",
    );
  }
}

export const env = parsed.data ?? (process.env as unknown as z.infer<typeof serverEnvSchema>);
