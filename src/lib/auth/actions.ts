"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
  destroySession,
} from "@/lib/auth/session";
import { safeFrom } from "@/lib/safe-redirect";
import { assertRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Database email/password authentication actions.
 *
 * - `login` verifies credentials against the `User` table, creates a DB-backed
 *   session, sets the `hc_session` cookie, and redirects to the post-login
 *   destination.
 * - `logout` destroys the session and redirects to `/login`.
 *
 * Privy is NOT involved here — it is reserved for the USDC payment flow.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Anti-enumeration: identical message whether the email exists or not. */
const INVALID_CREDENTIALS = "Invalid email or password";

/** A constant argon2id hash used to equalise timing for unknown emails. */
// argon2id hash of a random throwaway string (OWASP params). Verifying a
// candidate password against this when the user does not exist keeps the
// response time of "unknown email" and "wrong password" indistinguishable,
// closing the timing side-channel that would otherwise leak which emails are
// registered.
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$qbLCcIgXJz9tBmJFP0p0yw$QA4glsGvrLr7eLwgnVmtLG4Nakm7sz7viOUXZdQqFks";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginResult = { ok: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Best-effort client IP for rate-limiting, from proxy headers. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** Coerce a FormData or plain object into the raw login fields. */
function readLoginInput(
  input: FormData | { email?: unknown; password?: unknown },
): { email: unknown; password: unknown } {
  if (input instanceof FormData) {
    return { email: input.get("email"), password: input.get("password") };
  }
  return { email: input.email, password: input.password };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Authenticate with email + password.
 *
 * On success: creates a session, sets the cookie, and redirects (never returns).
 * On failure: returns `{ ok: false, error }` for inline display — no thrown
 * errors leak to the form. `redirect()` is intentionally called OUTSIDE any
 * try/catch (it works by throwing a NEXT_REDIRECT control-flow signal).
 */
export async function login(
  input: FormData | { email?: string; password?: string },
  from?: string,
): Promise<LoginResult> {
  // Rate-limit by IP: 10 attempts / minute. Throttling here blunts both
  // credential-stuffing and enumeration probing.
  try {
    await assertRateLimit(`login:${await clientIp()}`, 10, 60_000);
  } catch {
    return { ok: false, error: "Too many attempts. Please try again shortly." };
  }

  const parsed = loginSchema.safeParse(readLoginInput(input));
  if (!parsed.success) {
    // Generic message — never reveal which field failed in a way that aids
    // enumeration. A malformed email is still "invalid credentials" to a probe.
    return { ok: false, error: INVALID_CREDENTIALS };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  // Always run a verify (against the real hash, or a dummy when the user is
  // unknown) so the timing of both paths is comparable — anti-enumeration.
  const ok = user
    ? await verifyPassword(user.passwordHash, password)
    : await verifyPassword(DUMMY_HASH, password);

  if (!user || !ok) {
    logger.warn("login failed", { email });
    return { ok: false, error: INVALID_CREDENTIALS };
  }

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  logger.info("login success", { userId: user.id });

  // Outside try/catch: redirect throws NEXT_REDIRECT which must propagate.
  redirect(safeFrom(from));
}

/** Sign out: destroy the session row + clear the cookie, then go to /login. */
export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
