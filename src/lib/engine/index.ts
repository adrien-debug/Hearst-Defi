export { calcCalmar, calcMaxDrawdown, calcSharpe, calcSortino, calcVaR } from "./ratios";
export {
  BASE_MIX_BY_MODE,
  buildSignal,
  evaluateRules,
  THRESHOLDS,
} from "./rebalancing-rules";
export type {
  AllocationMix,
  EvaluateRulesInput,
  EvaluateRulesOutput,
  RebalanceSignal,
  VaultStateForSignal,
} from "./rebalancing-rules";
export {
  compareScenarios,
  getPresetInputs,
  METHODOLOGY_VERSION,
  runScenario,
} from "./scenario";
export type { RunScenarioOpts } from "./scenario";
export { createPrng, mulberry32 } from "./prng";
export type { Prng } from "./prng";
export { runMonteCarlo } from "./monte-carlo";
export type {
  BlendedYieldAssumptions,
  BtcGbmAssumptions,
  DifficultyAssumptions,
  MonteCarloInput,
  MonteCarloOutput,
  Percentiles,
} from "./monte-carlo";
export {
  getVaultDefinition,
  vaultAllocationWeights,
  VAULT_BTC_PLUS,
  VAULT_DEFENSIVE,
  VAULT_YIELD,
  VAULTS,
} from "./vaults";
export type {
  AllocationTargets,
  ApyTargetRange,
  Provenance,
  VaultAllocationWeights,
  VaultDefinition,
} from "./vaults";
export type {
  Allocation,
  AllocationBucket,
  BacktestKey,
  BacktestOutput,
  BtcGuardrail,
  BtcGuardrailKind,
  BtcTacticalAssessment,
  BtcTrigger,
  BtcTriggerKind,
  Confidence,
  MiningRevenue,
  MonthlyPoint,
  MonthlyReturn,
  Preset,
  ScenarioDelta,
  ScenarioInputs,
  ScenarioOutput,
  ScenarioParams,
  ScenarioResult,
  VaultId,
  VaultMode,
} from "./types";
