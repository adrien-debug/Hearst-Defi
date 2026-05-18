"use client";

import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";

// Privy (via styled-components) evaluates React hooks at module level,
// crashing Next.js 16 SSR prerender. The inner button is loaded client-only.
const LoginButtonInner = dynamic(
  () => import("./login-button-inner").then((m) => ({ default: m.LoginButtonInner })),
  {
    ssr: false,
    loading: () => (
      <Button variant="ghost" size="sm" disabled>
        Loading…
      </Button>
    ),
  }
);

const HAS_PRIVY_APP_ID =
  (process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "").length > 0;

/**
 * Login / logout pill. Mounted in the product header.
 *
 * When the Privy SDK isn't ready yet (initial hydration, or no app id wired)
 * we render a disabled placeholder so layout doesn't shift.
 *
 * In dev with no `NEXT_PUBLIC_PRIVY_APP_ID` the `PrivyProvider` is a
 * pass-through and the hooks below would throw without a context. We early-
 * return a disabled placeholder in that case to keep the layout intact.
 */
export function LoginButton() {
  if (!HAS_PRIVY_APP_ID) {
    return (
      <Button variant="ghost" size="sm" disabled>
        Auth disabled
      </Button>
    );
  }
  return <LoginButtonInner />;
}
