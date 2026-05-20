// All product routes require auth data and live vault state — disable static prerendering.
export const dynamic = "force-dynamic";

import { DemoModeToggleSlot } from "@/components/demo/demo-mode-toggle-slot";
import { HubModeStyles } from "@/components/hub-mode-styles";
import { ProductRailIntra } from "@/components/nav/product-rail-intra";

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HubModeStyles />
      <ProductRailIntra />
      {/* Floating slot — anchored top-right of the product area; hidden in prod
          unless demo mode is already on. See `DemoModeToggleSlot` for rules. */}
      <div className="fixed top-4 right-6 z-[var(--ct-z-overlay)] flex items-center gap-2">
        <DemoModeToggleSlot />
      </div>
      {children}
    </>
  );
}
