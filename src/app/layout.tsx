import type { Metadata } from "next";
import "./globals.css";

import { PrivyProvider } from "@/components/auth/privy-provider";
import { PRIVY_APP_ID } from "@/lib/auth/privy-config";

export const metadata: Metadata = {
  title: "Hearst Connect",
  description: "Institutional DeFi vault — Mining-backed structured yield",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PrivyProvider appId={PRIVY_APP_ID}>{children}</PrivyProvider>
      </body>
    </html>
  );
}
