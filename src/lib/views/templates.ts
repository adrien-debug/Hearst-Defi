/**
 * Default saved-view templates (8 presets seeded for every new user).
 * Pure data — no I/O, no DB, no fetch.
 */

export type ViewScope =
  | "vaults"
  | "distributions"
  | "proofs"
  | "investors"
  | "signers"
  | "memos"
  | "events";

export type ViewVisibility = "private" | "team";

export interface ViewFilters {
  [key: string]: unknown;
}

export interface ViewSort {
  field: string;
  direction: "asc" | "desc";
}

export interface ViewTemplate {
  name: string;
  scope: ViewScope;
  filters: ViewFilters;
  sort?: ViewSort;
  columns?: string[];
  visibility: ViewVisibility;
}

export const DEFAULT_VIEWS: ViewTemplate[] = [
  {
    name: "My signatures",
    scope: "signers",
    filters: { signers_contains: "@me", status: "pending" },
    visibility: "private",
  },
  {
    name: "LPs onboarding stuck",
    scope: "investors",
    filters: {
      kyc_status: ["pending", "review"],
      days_in_status: { gt: 3 },
    },
    visibility: "private",
  },
  {
    name: "Distributions this week",
    scope: "distributions",
    filters: { scheduled_at: { within: "7d" } },
    visibility: "private",
  },
  {
    name: "Vaults needing attention",
    scope: "vaults",
    filters: {
      OR: [
        { health: { ne: "healthy" } },
        { oracle_stale: true },
        { pending_signers: { gt: 0 } },
      ],
    },
    visibility: "private",
  },
  {
    name: "Anomalies last 24h",
    scope: "events",
    filters: { severity: ["warn", "error"], ts: { within: "24h" } },
    visibility: "private",
  },
  {
    name: "High-priority LPs",
    scope: "investors",
    filters: { commitment_usd: { gt: 5_000_000 } },
    visibility: "private",
  },
  {
    name: "Pending memos",
    scope: "memos",
    filters: { status: "draft", due_date: { within: "7d" } },
    visibility: "private",
  },
  {
    name: "Stale oracles",
    scope: "vaults",
    filters: { oracle_last_update: { gt: "1h" }, status: "live" },
    visibility: "private",
  },
];

export const DEFAULT_VIEW_COUNT = DEFAULT_VIEWS.length;
