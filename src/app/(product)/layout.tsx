// All product routes require auth data and live vault state — disable static prerendering.
export const dynamic = "force-dynamic";

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
      {children}
    </>
  );
}
