"use client";

import { useEffect } from "react";

/**
 * Lightweight product analytics wrapper.
 *
 * Supports PostHog when configured via NEXT_PUBLIC_POSTHOG_KEY.
 * Gracefully degrades to a no-op when the key is absent.
 *
 * Usage:
 *   <Analytics />
 *
 * Place inside the root layout (client component boundary).
 */
export function Analytics() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || key.length === 0) return;

    // Dynamically load PostHog to avoid bundling when unused
    import("posthog-js")
      .then((module) => {
        const posthog = module.default;
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
          capture_pageview: true,
          capture_pageleave: true,
          autocapture: false, // Manual event tracking only (privacy-conscious)
          loaded: (ph) => {
            if (process.env.NODE_ENV === "development") {
              ph.opt_out_capturing();
            }
          },
        });
      })
      .catch(() => {
        // Silently fail if PostHog is not installed
      });
  }, []);

  return null;
}
