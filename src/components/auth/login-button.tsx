"use client";

import { useLogin, useLogout, usePrivy } from "@privy-io/react-auth";

import { Button } from "@/components/ui/button";

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

function LoginButtonInner() {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();

  if (!ready) {
    return (
      <Button variant="ghost" size="sm" disabled>
        Loading…
      </Button>
    );
  }

  if (authenticated && user) {
    const emailAddress = user.email?.address;
    const walletAddress = user.wallet?.address;
    const label = emailAddress
      ? emailAddress
      : walletAddress
        ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
        : "Account";

    return (
      <Button variant="ghost" size="sm" onClick={() => logout()}>
        {label} · Log out
      </Button>
    );
  }

  return (
    <Button variant="primary" size="sm" onClick={() => login()}>
      Log in
    </Button>
  );
}
