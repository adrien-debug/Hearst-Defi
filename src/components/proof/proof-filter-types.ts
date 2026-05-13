export type FilterValue =
  | "all"
  | "mining_attestation"
  | "custody"
  | "audit"
  | "methodology";

const URL_ALIASES: Record<string, FilterValue> = {
  mining: "mining_attestation",
  mining_attestation: "mining_attestation",
  custody: "custody",
  audit: "audit",
  methodology: "methodology",
  all: "all",
};

export function parseFilter(raw: string | null | undefined): FilterValue {
  if (!raw) return "all";
  return URL_ALIASES[raw] ?? "all";
}
