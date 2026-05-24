import "server-only";

import { loadAdvancedMetrics as realLoadAdvancedMetrics } from "@/lib/data/advanced-metrics";
import { loadDashboardData as realLoadDashboardData } from "@/lib/data/dashboard";
import { fetchHashprice as realFetchHashprice } from "@/lib/data/hashprice";
import { getProofs as realGetProofs } from "@/lib/data/proofs";
import { loadRiskFramework as realLoadRiskFramework } from "@/lib/data/risk-framework";
import {
  loadPortfolio as realLoadPortfolio,
  loadPosition as realLoadPosition,
} from "@/lib/data/portfolio";
import {
  listVaults as realListVaults,
  getVault as realGetVault,
} from "@/lib/data/vaults";

import { withDemoFallback } from ".";
import {
  DEMO_ADVANCED_METRICS,
  DEMO_DASHBOARD_DATA,
  DEMO_HASHPRICE,
  DEMO_PROOFS,
  DEMO_RISK_FRAMEWORK,
  DEMO_PORTFOLIO_DATA,
  DEMO_POSITION_DETAIL,
  DEMO_VAULT_LIST,
  DEMO_VAULT_PRODUCT,
} from "./fixtures";

/**
 * Demo-aware loaders. Each function returns the real loader's output in
 * production and the deterministic fixture set when demo mode is active
 * (env var or cookie — see `src/lib/demo/index.ts`).
 *
 * Server Components that render investor-facing surfaces (dashboard,
 * proof-center, etc.) MUST consume these wrappers; API routes and Inngest
 * crons keep calling the real `@/lib/data/*` loaders so jobs never see
 * demo data.
 */

export function loadDashboardData(vaultId?: string) {
  return withDemoFallback(
    () => realLoadDashboardData(vaultId),
    DEMO_DASHBOARD_DATA,
  );
}

export function loadAdvancedMetrics() {
  return withDemoFallback(realLoadAdvancedMetrics, DEMO_ADVANCED_METRICS);
}

export function loadRiskFramework() {
  return withDemoFallback(realLoadRiskFramework, DEMO_RISK_FRAMEWORK);
}

export function fetchHashprice() {
  return withDemoFallback(realFetchHashprice, DEMO_HASHPRICE);
}

export async function getProofs() {
  const result = await withDemoFallback(realGetProofs, {
    data: DEMO_PROOFS,
    total: DEMO_PROOFS.length,
    page: 1,
    pageSize: DEMO_PROOFS.length,
    hasMore: false,
  });
  return result.data;
}

export function loadPortfolio() {
  return withDemoFallback(realLoadPortfolio, DEMO_PORTFOLIO_DATA);
}

export function loadPosition(positionId: string) {
  return withDemoFallback(
    () => realLoadPosition(positionId),
    // In demo mode always return the single demo position regardless of id
    DEMO_POSITION_DETAIL,
  );
}

export function listVaults() {
  return withDemoFallback(realListVaults, DEMO_VAULT_LIST);
}

export function getVault(idOrTicker: string) {
  return withDemoFallback(
    () => realGetVault(idOrTicker),
    DEMO_VAULT_PRODUCT,
  );
}
