"use client";

import { CockpitShell } from "@hearst/cockpit-shell";
import type { ChatConfig } from "@hearst/cockpit-shell";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ConnectBottomNav } from "@/components/nav/connect-bottom-nav";
import { AmbientLights } from "@/components/ambient-lights";
import { CT_PRODUCT_CONNECT_HEX } from "@/lib/cockpit-tokens";

const CONNECT_PRODUCTS = [
  { id: "connect" as const, name: "Hearst Connect", short: "CN", color: CT_PRODUCT_CONNECT_HEX },
];

const CHAT_CONFIG: ChatConfig = {
  apiEndpoint: "/api/cockpit-chat",
  productContext: "Hearst Connect — Single-vault institutional DeFi platform. Mining-backed structured yield, monthly USDC distributions, target APY 8–15%.",
};

export function ConnectShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The bottom nav is the INVESTOR nav (Portfolio / Vaults / Profile). It must
  // never appear in the admin universe — the two zones are watertight. Admins
  // navigate via the left AdminRailIntra instead.
  const showBottomNav =
    !pathname.startsWith("/debug") && !pathname.startsWith("/admin");

  return (
    <>
      <AmbientLights />
      <CockpitShell
        products={CONNECT_PRODUCTS}
        appId="connect"
        chatConfig={CHAT_CONFIG}
      >
        {children}
      </CockpitShell>
      {showBottomNav ? <ConnectBottomNav /> : null}
    </>
  );
}
