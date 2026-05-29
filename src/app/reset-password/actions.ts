"use server";

import { z } from "zod";
import { consumeResetToken } from "@/lib/auth/password-reset";

const schema = z.object({
  token: z.string().min(1, "Missing reset token."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
});

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; error: string };

export async function resetPassword(
  input: FormData | { token?: unknown; password?: unknown },
): Promise<ResetPasswordResult> {
  const raw = input instanceof FormData
    ? { token: input.get("token"), password: input.get("password") }
    : { token: input.token, password: input.password };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid input." };
  }

  const { token, password } = parsed.data;
  const result = await consumeResetToken(token, password);

  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: "This reset link is invalid.",
      expired: "This reset link has expired. Please request a new one.",
      already_used: "This reset link has already been used. Please request a new one.",
      weak_password: "Password must be at least 8 characters.",
    };
    return {
      ok: false,
      error: messages[result.reason] ?? "An unexpected error occurred.",
    };
  }

  return { ok: true };
}
