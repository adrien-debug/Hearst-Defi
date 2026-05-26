import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Admin diagnostic endpoint — calls each /admin/dashboard loader in isolation
 * and reports which one throws. Returns JSON so we can pinpoint the failure
 * without trying to parse a streamed RSC payload from the error boundary.
 *
 * Requires an authenticated admin session. Refuses otherwise.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (session.role !== "admin") {
    return NextResponse.json({ error: "forbidden", role: session.role }, { status: 403 });
  }

  const results: Record<string, { ok: true } | { ok: false; error: string; stack?: string }> = {};

  async function run(name: string, fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
      results[name] = { ok: true };
    } catch (err) {
      results[name] = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.slice(0, 1500) : undefined,
      };
    }
  }

  // Dynamic imports so a broken loader cannot prevent the route module from
  // loading at all.
  await run("loadDashboardData", async () => {
    const { loadDashboardData } = await import("@/lib/data/dashboard");
    await loadDashboardData();
  });
  await run("loadRiskFramework", async () => {
    const { loadRiskFramework } = await import("@/lib/data/risk-framework");
    await loadRiskFramework();
  });
  await run("loadCustody", async () => {
    const { loadCustody } = await import("@/lib/data/custody");
    await loadCustody();
  });
  await run("loadAdvancedMetrics", async () => {
    const { loadAdvancedMetrics } = await import("@/lib/data/advanced-metrics");
    await loadAdvancedMetrics();
  });
  await run("listAllVaults", async () => {
    const { listAllVaults } = await import("@/lib/vaults/resolver");
    await listAllVaults({ status: "any" });
  });

  return NextResponse.json(
    {
      runtime: { hasAsyncLocalStorage: typeof globalThis !== "undefined" },
      session: { userId: session.userId, email: session.email, role: session.role },
      results,
    },
    { status: 200, headers: { "cache-control": "private, no-store" } },
  );
}
