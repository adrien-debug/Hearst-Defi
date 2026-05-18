"use server";

import { headers } from "next/headers";

import { getRequestContext, withRequestContext } from "@/lib/request-context";

/**
 * Reads the `x-request-id` header (set by middleware) and runs the given
 * function inside a request context so that the logger automatically
 * includes the request ID in every log entry.
 *
 * Use this at the top of every Server Action and Server Component data
 * loader that needs distributed tracing.
 */
export async function withRequestId<T>(fn: () => T | Promise<T>): Promise<T> {
  const h = await headers();
  const requestId = h.get("x-request-id") ?? generateRequestId();
  return withRequestContext({ requestId }, fn);
}

function generateRequestId(): string {
  // crypto.randomUUID is available in Node 19+ and Edge Runtime
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Returns the current request ID from the async context, or null.
 */
export function getCurrentRequestId(): string | null {
  return getRequestContext()?.requestId ?? null;
}
