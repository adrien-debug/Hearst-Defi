import "server-only";

import { loadDashboardData as realLoadDashboardData } from "@/lib/data/dashboard";
import { fetchHashprice as realFetchHashprice } from "@/lib/data/hashprice";
import { getProofs as realGetProofs } from "@/lib/data/proofs";
import { loadRiskFramework as realLoadRiskFramework } from "@/lib/data/risk-framework";
import { loadPortfolio as realLoadPortfolio } from "@/lib/data/portfolio";
import {
  listVaults as realListVaults,
  getVault as realGetVault,
} from "@/lib/data/vaults";

import { withDemoFallback } from ".";
import {
  DEMO_DASHBOARD_DATA,
  DEMO_HASHPRICE,
  DEMO_PROOFS,
  DEMO_RISK_FRAMEWORK,
  DEMO_PORTFOLIO_DATA,
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

export function loadDashboardData() {
  return withDemoFallback(realLoadDashboardData, DEMO_DASHBOARD_DATA);
}

export function loadRiskFramework() {
  return withDemoFallback(realLoadRiskFramework, DEMO_RISK_FRAMEWORK);
}

export function fetchHashprice() {
  return withDemoFallback(realFetchHashprice, DEMO_HASHPRICE);
}

export function getProofs() {
  return withDemoFallback(realGetProofs, DEMO_PROOFS);
}

export function loadPortfolio() {
  return withDemoFallback(realLoadPortfolio, DEMO_PORTFOLIO_DATA);
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
