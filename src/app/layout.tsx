import type { Metadata } from "next";
import "./tokens-layer.css";
import "./globals.css";
import "./cockpit.css";

import { AppChrome } from "@/components/app-chrome";
import { Analytics } from "@/components/analytics";
import { PrivyProvider } from "@/components/auth/privy-provider";
import { ClientToaster } from "@/components/ui/client-toaster";
import { PRIVY_APP_ID } from "@/lib/auth/privy-config";

export const metadata: Metadata = {
  title: { default: "Hearst Connect", template: "%s | Hearst Connect" },
  description: "Institutional DeFi vault — Mining-backed structured yield",
  metadataBase: new URL("https://connect.hearst.app"),
  openGraph: {
    type: "website",
    siteName: "Hearst Connect",
    title: "Hearst Connect — Institutional DeFi Vault",
    description: "Mining-backed structured yield, monthly USDC distributions, target APY range 8–15%.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hearst Connect",
    description: "Institutional DeFi vault — Mining-backed structured yield",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-rail-mode="collapsed" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppChrome>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[var(--ct-z-overlay)] focus:rounded-[var(--ct-radius-lg)] focus:bg-[var(--ct-accent)] focus:px-4 focus:py-2 focus:text-[var(--ct-bg-deep)]"
          >
            Skip to main content
          </a>
          <PrivyProvider appId={PRIVY_APP_ID}>
            <main id="main-content">{children}</main>
            <ClientToaster />
          </PrivyProvider>
          <Analytics />
        </AppChrome>
      </body>
    </html>
  );
}
