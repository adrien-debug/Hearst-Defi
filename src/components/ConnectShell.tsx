"use client";

import { CockpitShell } from "@hearst/cockpit-shell";
import type { ChatConfig } from "@hearst/cockpit-shell";
import type { ReactNode } from "react";

import { CT_PRODUCT_CONNECT_HEX } from "@/lib/cockpit-tokens";

const CONNECT_PRODUCTS = [
  { id: "connect" as const, name: "Hearst Connect", short: "CN", color: CT_PRODUCT_CONNECT_HEX },
];

const CHAT_CONFIG: ChatConfig = {
  apiEndpoint: "/api/cockpit-chat",
  productContext: "Hearst Connect — Single-vault institutional DeFi platform. Mining-backed structured yield, monthly USDC distributions, target APY 8–15%.",
};

export function ConnectShell({ children }: { children: ReactNode }) {
  return (
    <CockpitShell
      products={CONNECT_PRODUCTS}
      appId="connect"
      chatConfig={CHAT_CONFIG}
    >
      {children}
    </CockpitShell>
  );
}
