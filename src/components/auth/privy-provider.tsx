"use client";

import { PrivyProvider as Privy } from "@privy-io/react-auth";
import type { ReactNode } from "react";

/**
 * Wraps the app in Privy's React context.
 *
 * When `appId` is empty (local dev without the env var set), this component
 * is a pass-through — the app renders normally, the login button is a no-op,
 * and the middleware also lets gated routes through. This keeps the local
 * dev loop friction-free until the Privy keys are wired up.
 */
export function PrivyProvider({
  children,
  appId,
}: {
  children: ReactNode;
  appId: string;
}) {
  if (!appId) return <>{children}</>;

  return (
    <Privy
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#a7fb90",
          logo: "/logos/hearst-connect.svg",
        },
        loginMethods: ["email", "wallet"],
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
      }}
    >
      {children}
    </Privy>
  );
}
