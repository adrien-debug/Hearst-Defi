import "server-only";

import { loadDashboardData as realLoadDashboardData } from "@/lib/data/dashboard";
import { fetchHashprice as realFetchHashprice } from "@/lib/data/hashprice";
import { getProofs as realGetProofs } from "@/lib/data/proofs";
import { loadRiskFramework as realLoadRiskFramework } from "@/lib/data/risk-framework";

import { withDemoFallback } from ".";
import {
  DEMO_DASHBOARD_DATA,
  DEMO_HASHPRICE,
  DEMO_PROOFS,
  DEMO_RISK_FRAMEWORK,
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
