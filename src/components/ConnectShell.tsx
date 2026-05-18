"use client";

import { CockpitShell } from "@hearst/cockpit-shell";
import type { ReactNode } from "react";

const CONNECT_PRODUCTS = [
  { id: "connect" as const, name: "Hearst Connect", short: "CN", color: "#A7FB90" },
];

export function ConnectShell({ children }: { children: ReactNode }) {
  return (
    <CockpitShell products={CONNECT_PRODUCTS} appId="connect">
      {children}
    </CockpitShell>
  );
}
