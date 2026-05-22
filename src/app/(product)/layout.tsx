// All product routes require auth data and live vault state — disable static prerendering.
export const dynamic = "force-dynamic";

import { DemoModeToggleSlot } from "@/components/demo/demo-mode-toggle-slot";
import { HubModeStyles } from "@/components/hub-mode-styles";
import { HeaderConnect } from "@/components/connect/header-connect";
import { requireInvestor } from "@/lib/auth/require-investor";

export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Watertight investor gate (mirror of the admin layout's requireAdmin):
  // no session → /login, admin → /admin (sent back to their own zone).
  await requireInvestor("/portfolio");

  return (
    <>
      <HubModeStyles />
      {/* Navigation is the floating bottom bar (ConnectBottomNav) only —
          the intra-app left rail is intentionally removed. */}
      {/* Identity slot — docked into the bottom of the left rail (Section 1),
          stacked just above the rail's user badge. Anchored bottom-left rather
          than top-right so it no longer overlaps the chat header controls
          (Historique / Paramètres / Replier) in Section 3.
          HeaderConnect renders only when Privy authenticated (returns null otherwise).
          DemoModeToggleSlot is hidden in prod unless demo mode is on. */}
      <div className="connect-rail-identity">
        <HeaderConnect />
        <DemoModeToggleSlot />
      </div>
      {children}
    </>
  );
}
