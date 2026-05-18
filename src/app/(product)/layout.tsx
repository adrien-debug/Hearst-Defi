// All product routes require auth data and live vault state — disable static prerendering.
export const dynamic = "force-dynamic";

import { HubModeStyles } from "@/components/hub-mode-styles";
import { ProductRailIntra } from "@/components/nav/product-rail-intra";
import { ConnectBottomBar } from "@/components/nav/connect-bottom-bar";

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="ct-page-area">
      <HubModeStyles />
      <ProductRailIntra />
      {children}
      <ConnectBottomBar />
    </div>
  );
}
