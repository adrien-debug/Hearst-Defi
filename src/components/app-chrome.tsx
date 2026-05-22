"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ConnectShell } from "@/components/ConnectShell";
import { AdminChatControls } from "@/components/admin/admin-chat-controls";

// Routes that render WITHOUT the product chrome (left rail, bottom nav, Kimi
// chat). The sign-in screen must stand alone — no navigation into product
// surfaces is offered until the user is authenticated.
const BARE_ROUTES = new Set<string>(["/", "/login"]);

/**
 * Decides whether to wrap children in the full Cockpit shell or render them
 * bare. The shell (rail + chat + bottom nav) is for authenticated product
 * surfaces; the auth screens opt out so nothing leaks before sign-in.
 */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.has(pathname);

  if (bare) {
    return <div className="min-h-dvh bg-[var(--ct-bg-deep)]">{children}</div>;
  }

  return (
    <ConnectShell>
      {children}
      {/* Chat mode selector (Conversation / Review). Self-gates to admins via
          the requireAdmin-protected /api/admin/review-mode route; renders
          nothing for everyone else. Mounted here so it's available on every
          product page, not just /admin. */}
      <AdminChatControls />
    </ConnectShell>
  );
}
