"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { requestPasswordReset, RESET_REQUESTED_MSG } from "@/lib/auth/password-reset";
import { assertRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export type ForgotPasswordResult =
  | { ok: true; message: typeof RESET_REQUESTED_MSG }
  | { ok: false; error: string };

export async function forgotPassword(
  input: FormData | { email?: unknown },
): Promise<ForgotPasswordResult> {
  const raw = input instanceof FormData ? input.get("email") : input.email;
  const parsed = schema.safeParse({ email: raw });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email address." };
  }

  // Derive the app origin from request headers (server-only, not from env).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const appUrl = `${proto}://${host}`;

  // Rate-limit by IP: 3 requests / 15min. Blunts email-bombing of existing
  // users and enumeration-by-volume. On limit, return the SAME constant message
  // as the normal path so the throttle is not itself an enumeration signal.
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
  try {
    await assertRateLimit(`forgot:${ip}`, 3, 900_000);
  } catch {
    return { ok: true, message: RESET_REQUESTED_MSG };
  }

  const message = await requestPasswordReset(parsed.data.email, appUrl);
  return { ok: true, message };
}
