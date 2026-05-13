import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
