// All product routes require auth data and live vault state — disable static prerendering.
export const dynamic = "force-dynamic";

import { HubModeStyles } from "@/components/hub-mode-styles";
import { HeaderConnect } from "@/components/connect/header-connect";
import { InvestorRailIntra } from "@/components/nav/product-rail-intra";
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
      {/* Left rail — investor nav (Portfolio / Vaults / Profile).
          Watertight: admin items never appear here. */}
      <InvestorRailIntra />
      {/* Identity slot — docked into the bottom of the left rail (Section 1).
          HeaderConnect renders only when Privy authenticated. */}
      <div className="connect-rail-identity">
        <HeaderConnect />
      </div>
      {children}
    </>
  );
}
