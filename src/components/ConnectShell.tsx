"use client";

import { CockpitShell } from "@hearst/cockpit-shell";
import type { ReactNode } from "react";

import { CT_PRODUCT_CONNECT_HEX } from "@/lib/cockpit-tokens";
import { ConnectBottomBar } from "@/components/nav/connect-bottom-bar";

const CONNECT_PRODUCTS = [
  { id: "connect" as const, name: "Hearst Connect", short: "CN", color: CT_PRODUCT_CONNECT_HEX },
];

export function ConnectShell({ children }: { children: ReactNode }) {
  return (
    <CockpitShell products={CONNECT_PRODUCTS} appId="connect" bottomBar={<ConnectBottomBar />}>
      {children}
    </CockpitShell>
  );
}
