import { describe, expect, it } from "vitest";

/**
 * We test env validation by simulating the validation logic directly.
 * We cannot re-import the module because it evaluates at import time.
 *
 * The schema here must mirror `src/lib/env.ts` exactly.
 * When new variables are added to env.ts, add corresponding cases below.
 */

import { z } from "zod";

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
  ADMIN_EMAILS: z.string().optional(),
  ADMIN_INITIAL_PASSWORD: z.string().optional(),
  ADMIN_ADDRESSES: z.string().optional(),
  HEARST_PUBLISHER: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

describe("env validation", () => {
  it("accepts a complete valid config", () => {
    const parsed = serverEnvSchema.safeParse({
      DATABASE_URL: "file:./prisma/dev.db",
      ANTHROPIC_API_KEY: "sk-ant-api03-test",
      PRIVY_APP_SECRET: "secret",
      NEXT_PUBLIC_PRIVY_APP_ID: "app-id",
      NEXT_PUBLIC_CHAIN_RPC_URL: "https://sepolia.base.org",
    });
    expect(parsed.success).toBe(true);
  });

  it("fails when DATABASE_URL is missing", () => {
    const parsed = serverEnvSchema.safeParse({
      ANTHROPIC_API_KEY: "sk-ant-api03-test",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors).toHaveProperty("DATABASE_URL");
    }
  });

  it("fails when ANTHROPIC_API_KEY has wrong prefix", () => {
    const parsed = serverEnvSchema.safeParse({
      DATABASE_URL: "file:./prisma/dev.db",
      ANTHROPIC_API_KEY: "bad-prefix",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.flatten().fieldErrors.ANTHROPIC_API_KEY?.[0],
      ).toContain("sk-ant");
    }
  });

  it("allows ANTHROPIC_API_KEY to be absent", () => {
    const parsed = serverEnvSchema.safeParse({
      DATABASE_URL: "file:./prisma/dev.db",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid URL for NEXT_PUBLIC_CHAIN_RPC_URL", () => {
    const parsed = serverEnvSchema.safeParse({
      DATABASE_URL: "file:./prisma/dev.db",
      NEXT_PUBLIC_CHAIN_RPC_URL: "not-a-url",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors).toHaveProperty(
        "NEXT_PUBLIC_CHAIN_RPC_URL",
      );
    }
  });

  // ── New variables added in the WIP branch ──────────────────────────────────

  it("accepts ADMIN_EMAILS + ADMIN_INITIAL_PASSWORD (admin bootstrap, optional)", () => {
    const parsed = serverEnvSchema.safeParse({
      DATABASE_URL: "file:./prisma/dev.db",
      ADMIN_EMAILS: "ops@hearst.connect,founder@hearst.connect",
      ADMIN_INITIAL_PASSWORD: "change-me-now",
    });
    expect(parsed.success).toBe(true);
  });

  it("allows ADMIN_EMAILS to be absent (seed becomes a no-op)", () => {
    const parsed = serverEnvSchema.safeParse({
      DATABASE_URL: "file:./prisma/dev.db",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts valid UPSTASH_REDIS_REST_URL", () => {
    const parsed = serverEnvSchema.safeParse({
      DATABASE_URL: "file:./prisma/dev.db",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "tok_abc",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects UPSTASH_REDIS_REST_URL that is not a valid URL", () => {
    const parsed = serverEnvSchema.safeParse({
      DATABASE_URL: "file:./prisma/dev.db",
      UPSTASH_REDIS_REST_URL: "not-a-url",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors).toHaveProperty("UPSTASH_REDIS_REST_URL");
    }
  });

  it("allows UPSTASH_REDIS_REST_URL to be absent", () => {
    const parsed = serverEnvSchema.safeParse({ DATABASE_URL: "file:./prisma/dev.db" });
    expect(parsed.success).toBe(true);
  });

  it("accepts valid INNGEST_SIGNING_KEY", () => {
    const parsed = serverEnvSchema.safeParse({
      DATABASE_URL: "file:./prisma/dev.db",
      INNGEST_SIGNING_KEY: "signkey-test-abc123",
      INNGEST_EVENT_KEY: "evkey-test-xyz789",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts each valid LOG_LEVEL value", () => {
    for (const level of ["debug", "info", "warn", "error"] as const) {
      const parsed = serverEnvSchema.safeParse({
        DATABASE_URL: "file:./prisma/dev.db",
        LOG_LEVEL: level,
      });
      expect(parsed.success, `LOG_LEVEL=${level} should be accepted`).toBe(true);
    }
  });

  it("rejects an invalid LOG_LEVEL value", () => {
    const parsed = serverEnvSchema.safeParse({
      DATABASE_URL: "file:./prisma/dev.db",
      LOG_LEVEL: "verbose",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors).toHaveProperty("LOG_LEVEL");
    }
  });
});
