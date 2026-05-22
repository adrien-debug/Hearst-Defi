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
  // Investor gate: no session → /login. Admins are allowed through (admin ⊇
  // investor) so they can review the product surfaces A→Z.
  const session = await requireInvestor("/portfolio");

  return (
    <>
      <HubModeStyles />
      {/* Left rail — investor nav (Portfolio / Vaults / Profile).
          Admins additionally get an "Admin" entry to jump to their zone. */}
      <InvestorRailIntra isAdmin={session.role === "admin"} />
      {/* Identity slot — docked into the bottom of the left rail (Section 1).
          HeaderConnect renders only when Privy authenticated. */}
      <div className="connect-rail-identity">
        <HeaderConnect />
      </div>
      {children}
    </>
  );
}
