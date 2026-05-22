// Display-label maps for vault metadata enums. Single source of truth shared by
// the admin vault list and detail pages (was duplicated inline in both — audit N4/D2).
// Lookups stay `?? raw` at the call site so an unknown DB value still renders.

export const STRATEGY_LABELS: Record<string, string> = {
  mining_yield: "Mining Yield",
  btc_tactical: "BTC Tactical",
  stable_reserve: "Stable Reserve",
};

export const REG_LABELS: Record<string, string> = {
  regD_506c: "Reg D 506(c)",
  regS: "Reg S",
  art2_lux: "Art. 2 Lux",
};

export const SPV_LABELS: Record<string, string> = {
  cayman: "Cayman Islands",
  bvi: "British Virgin Islands",
  delaware: "Delaware",
  lux: "Luxembourg",
};
