"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { DEMO_COOKIE_NAME } from "@/lib/demo";

/**
 * Toggle the demo-mode cookie for the current browser.
 *
 * No auth gate: demo mode never escapes the per-browser cookie scope (and the
 * `DEMO_MODE_DEFAULT=1` env var is the only way to force it globally). Anyone
 * may flip their own browser into demo while pitching — that's the whole
 * point.
 *
 * Revalidates the root layout so every Server Component re-renders with the
 * new fixture set.
 */
export async function toggleDemoMode(): Promise<{ active: boolean }> {
  const store = await cookies();
  const current = store.get(DEMO_COOKIE_NAME)?.value === "1";

  if (current) {
    store.delete(DEMO_COOKIE_NAME);
  } else {
    store.set(DEMO_COOKIE_NAME, "1", {
      // Readable client-side so the banner / toggle can self-mirror without
      // a round-trip; demo mode is not a security boundary.
      httpOnly: false,
      sameSite: "lax",
      // 24 hours — long enough for a pitch session, short enough that nobody
      // leaves their own dashboard accidentally stuck in demo.
      maxAge: 60 * 60 * 24,
      path: "/",
    });
  }

  revalidatePath("/", "layout");
  return { active: !current };
}
