// All product routes require auth data and live vault state — disable static prerendering.
export const dynamic = "force-dynamic";

import { DemoBanner } from "@/components/demo/demo-banner";
import { DemoModeToggleSlot } from "@/components/demo/demo-mode-toggle-slot";
import { HubModeStyles } from "@/components/hub-mode-styles";
import { ProductRailIntra } from "@/components/nav/product-rail-intra";
import { HeaderConnect } from "@/components/connect/header-connect";

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DemoBanner />
      <HubModeStyles />
      <ProductRailIntra />
      {/* Floating slot — anchored top-right of the product area.
          HeaderConnect renders only when Privy authenticated (returns null otherwise).
          DemoModeToggleSlot is hidden in prod unless demo mode is on. */}
      <div className="fixed top-4 right-[max(1.5rem,env(safe-area-inset-right))] z-[var(--ct-z-overlay)] flex items-center gap-2">
        <HeaderConnect />
        <DemoModeToggleSlot />
      </div>
      {children}
    </>
  );
}
