import "server-only";

import { hash, verify } from "@node-rs/argon2";

// `@node-rs/argon2` exports `Algorithm` as a `const enum`, which cannot be
// imported as a value under `isolatedModules` (the SWC transform can't inline
// it). Argon2id is the numeric value 2 in that enum; we pin it directly.
const ALGORITHM_ARGON2ID = 2;

/**
 * Password hashing for database email/password auth.
 *
 * Uses argon2id (the OWASP-recommended variant — resistant to both GPU and
 * side-channel attacks) via the native `@node-rs/argon2` binding. Parameters
 * follow the OWASP Password Storage Cheat Sheet "second" configuration:
 *   memory 19 MiB, 2 iterations, 1 degree of parallelism.
 *
 * The encoded output already embeds the algorithm, parameters, and a random
 * per-hash salt, so `verifyPassword` needs only the stored hash + the candidate
 * plaintext — no separate salt column.
 */

// OWASP-recommended argon2id parameters (memory in KiB).
const ARGON2_OPTIONS = {
  algorithm: ALGORITHM_ARGON2ID,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

/** Hash a plaintext password with argon2id. Returns the encoded hash string. */
export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a stored argon2 hash.
 *
 * Returns false (never throws) on a malformed hash or mismatch, so callers can
 * treat "wrong password" and "corrupt record" identically — see the
 * anti-enumeration handling in `actions.ts`.
 */
export async function verifyPassword(
  hashed: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}
