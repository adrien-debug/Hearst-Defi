import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";

import { AdminRailIntra } from "@/components/nav/product-rail-intra";
import { AdminSubNav } from "@/components/nav/admin-sub-nav";
import { VaultBreadcrumb } from "@/components/admin/vault-breadcrumb";
import { getSession } from "@/lib/auth/session";
import {
  getCurrentVaultContext,
  buildBreadcrumbSegments,
} from "@/lib/vaults/context";

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

  // We already have `session` from above and verified role server-side.
  // The previous try/catch over requireAdmin() was swallowing non-auth
  // failures (e.g. logging side effects) and rendering notFound() — a
  // legitimate admin would see a 404 because a downstream log helper
  // throws. Be explicit: enforce role here, don't call requireAdmin().
  if (session.role !== "admin") {
    notFound();
  }

  // ---------------------------------------------------------------------------
  // Vault context for the sticky breadcrumb.
  //
  // App Router layouts cannot receive `searchParams` directly. We read the
  // current URL from the `x-invoke-path` header that Next.js injects on every
  // RSC render. This gives us the raw pathname + search string (e.g.
  // "/admin/dashboard?vault=hyv-a") which we pass to the context helper.
  //
  // Fallback: if the header is absent (e.g. Storybook / unit-test environments),
  // we default to "/admin" so the breadcrumb degrades gracefully.
  // ---------------------------------------------------------------------------
  const h = await headers();
  const rawUrl = h.get("x-invoke-path") ?? h.get("referer") ?? "/admin";
  // Strip the origin when referer is a full URL.
  let invokePath = rawUrl;
  try {
    if (rawUrl.startsWith("http")) {
      const u = new URL(rawUrl);
      invokePath = `${u.pathname}${u.search}`;
    }
  } catch {
    // rawUrl is already a path — use as-is.
  }

  const [pathPart, queryPart = ""] = invokePath.split("?");
  const searchParams: { vault?: string } = {};
  if (queryPart) {
    const q = new URLSearchParams(queryPart);
    const vault = q.get("vault");
    if (vault) searchParams.vault = vault;
  }

  const vaultCtx = await getCurrentVaultContext(searchParams, pathPart ?? "/admin");
  const segments = buildBreadcrumbSegments(pathPart ?? "/admin", vaultCtx.current);

  return (
    <>
      <AdminRailIntra />
      {/* Sticky breadcrumb — sits between the rail and the sub-nav tabs */}
      <VaultBreadcrumb
        segments={segments}
        currentVault={vaultCtx.current}
        allVaults={vaultCtx.all}
      />
      <AdminSubNav />
      {children}
    </>
  );
}
