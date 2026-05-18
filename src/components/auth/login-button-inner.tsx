"use client";

import { useLogin, useLogout, usePrivy } from "@privy-io/react-auth";

import { Button } from "@/components/ui/button";

/**
 * The Privy-dependent part of the login button.
 * Only loaded on the client (via dynamic import with ssr:false in login-button.tsx).
 */
export function LoginButtonInner() {
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
