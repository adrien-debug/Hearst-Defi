import { notFound, redirect } from "next/navigation";

import { AdminRailIntra } from "@/components/nav/product-rail-intra";
import { AdminSubNav } from "@/components/nav/admin-sub-nav";
import { DemoModeToggleSlot } from "@/components/demo/demo-mode-toggle-slot";
import { getSession } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata = {
  title: "Admin — Hearst Connect",
};

/**
 * Server-side admin gate.
 *
 * The edge proxy can only verify that an `hc_session` cookie is PRESENT — it
 * cannot read the user's role without the DB. This layout is therefore the
 * authoritative admin check: it runs `requireAdmin()` (role === "admin") for
 * every `/admin/*` route before rendering any admin UI.
 *
 *  - No / invalid session  → redirect to /login?from=/admin (must sign in).
 *  - Authenticated, non-admin → notFound() (404 hides the admin area's
 *    existence instead of advertising a 403).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Distinguish "must sign in" from "forbidden" without string-matching errors.
  const session = await getSession();
  if (!session) {
    redirect("/login?from=/admin");
  }

  try {
    await requireAdmin();
  } catch {
    // Authenticated but not an admin → hide the area.
    notFound();
  }

  return (
    <>
      <AdminRailIntra />
      {/* Demo toggle lifted out of the content flow (was pushing the tabs/title
          down) — pinned bottom-left, clear of the left rail (≤232px expanded). */}
      <div className="fixed bottom-4 left-[15rem] z-[var(--ct-z-dropdown)]">
        <DemoModeToggleSlot />
      </div>
      <AdminSubNav />
      {children}
    </>
  );
}
