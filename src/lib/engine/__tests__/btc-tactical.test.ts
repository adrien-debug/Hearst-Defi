import { describe, expect, it } from "vitest";
import { assessBtcTactical } from "../btc-tactical";
import type { ScenarioInputs, VaultMode } from "../types";

const FORBIDDEN = ["guarantee", "promise", "risk-free", "certain", "will deliver"];

const NEUTRAL_INPUTS: ScenarioInputs = {
  btc_price_change_pct: 0,
  hashprice_usd_th_day: 0.085,
  energy_cost_kwh: 0.045,
  stable_apy_pct: 4.5,
  vol_index: 30,
};

function withInputs(partial: Partial<ScenarioInputs>): ScenarioInputs {
  return { ...NEUTRAL_INPUTS, ...partial };
}

function getTrigger(out: ReturnType<typeof assessBtcTactical>, id: string) {
  const t = out.triggers.find((x) => x.id === id);
  if (!t) throw new Error(`trigger ${id} missing`);
  return t;
}

describe("assessBtcTactical — rule armed states", () => {
  it("R-BTC-1 armed when drawdown <= -20% AND vol_index < 60", () => {
    const out = assessBtcTactical(
      withInputs({ btc_price_change_pct: -25, vol_index: 40 }),
      "balanced",
    );
    expect(getTrigger(out, "R-BTC-1").armed).toBe(true);
  });

  it("R-BTC-1 not armed when drawdown is -15% (above threshold)", () => {
    const out = assessBtcTactical(
      withInputs({ btc_price_change_pct: -15, vol_index: 40 }),
      "balanced",
    );
    expect(getTrigger(out, "R-BTC-1").armed).toBe(false);
  });

  it("R-BTC-1 not armed when vol_index >= 60 even if drawdown deep", () => {
    const out = assessBtcTactical(
      withInputs({ btc_price_change_pct: -30, vol_index: 60 }),
      "balanced",
    );
    expect(getTrigger(out, "R-BTC-1").armed).toBe(false);
  });

  it("R-BTC-2 armed when btc change >= 40%", () => {
    const out = assessBtcTactical(
      withInputs({ btc_price_change_pct: 45 }),
      "balanced",
    );
    expect(getTrigger(out, "R-BTC-2").armed).toBe(true);
  });

  it("R-BTC-2 not armed when btc change is 39%", () => {
    const out = assessBtcTactical(
      withInputs({ btc_price_change_pct: 39 }),
      "balanced",
    );
    expect(getTrigger(out, "R-BTC-2").armed).toBe(false);
  });

  it("R-BTC-3 armed when vol_index > 80", () => {
    const out = assessBtcTactical(
      withInputs({ vol_index: 85 }),
      "balanced",
    );
    expect(getTrigger(out, "R-BTC-3").armed).toBe(true);
  });

  it("R-BTC-3 not armed when vol_index is 80 (strict greater-than)", () => {
    const out = assessBtcTactical(
      withInputs({ vol_index: 80 }),
      "balanced",
    );
    expect(getTrigger(out, "R-BTC-3").armed).toBe(false);
  });

  it("R-BTC-4 hold armed when no other rule is armed", () => {
    const out = assessBtcTactical(NEUTRAL_INPUTS, "balanced");
    expect(getTrigger(out, "R-BTC-4").armed).toBe(true);
    expect(getTrigger(out, "R-BTC-1").armed).toBe(false);
    expect(getTrigger(out, "R-BTC-2").armed).toBe(false);
    expect(getTrigger(out, "R-BTC-3").armed).toBe(false);
  });

  it("R-BTC-4 hold not armed when R-BTC-2 is armed", () => {
    const out = assessBtcTactical(
      withInputs({ btc_price_change_pct: 50 }),
      "balanced",
    );
    expect(getTrigger(out, "R-BTC-4").armed).toBe(false);
  });
});

describe("assessBtcTactical — all 4 rules always present", () => {
  const cases: Array<{ name: string; inputs: ScenarioInputs; mode: VaultMode }> = [
    { name: "neutral balanced", inputs: NEUTRAL_INPUTS, mode: "balanced" },
    {
      name: "defensive bear",
      inputs: withInputs({ btc_price_change_pct: -30, vol_index: 40 }),
      mode: "defensive",
    },
    {
      name: "opportunistic bull",
      inputs: withInputs({ btc_price_change_pct: 60 }),
      mode: "opportunistic",
    },
    {
      name: "high vol",
      inputs: withInputs({ vol_index: 90 }),
      mode: "defensive",
    },
  ];
  for (const c of cases) {
    it(`returns all 4 triggers for ${c.name}`, () => {
      const out = assessBtcTactical(c.inputs, c.mode);
      expect(out.triggers).toHaveLength(4);
      const ids = out.triggers.map((t) => t.id);
      expect(ids).toEqual(["R-BTC-1", "R-BTC-2", "R-BTC-3", "R-BTC-4"]);
    });
  }
});

describe("assessBtcTactical — guardrails", () => {
  it("volatility breached when vol_index = 90", () => {
    const out = assessBtcTactical(withInputs({ vol_index: 90 }), "balanced");
    const g = out.guardrails.find((x) => x.kind === "volatility");
    expect(g?.status).toBe("breached");
  });

  it("volatility warning when vol_index = 70", () => {
    const out = assessBtcTactical(withInputs({ vol_index: 70 }), "balanced");
    const g = out.guardrails.find((x) => x.kind === "volatility");
    expect(g?.status).toBe("warning");
  });

  it("volatility normal when vol_index = 30", () => {
    const out = assessBtcTactical(withInputs({ vol_index: 30 }), "balanced");
    const g = out.guardrails.find((x) => x.kind === "volatility");
    expect(g?.status).toBe("normal");
  });

  it("mining_margin healthy when margin_score >= 70", () => {
    const out = assessBtcTactical(
      withInputs({ hashprice_usd_th_day: 0.12, energy_cost_kwh: 0.04 }),
      "balanced",
    );
    const g = out.guardrails.find((x) => x.kind === "mining_margin");
    expect(g?.status).toBe("healthy");
  });

  it("mining_margin breached when margin_score < 50", () => {
    const out = assessBtcTactical(
      withInputs({ hashprice_usd_th_day: 0.04, energy_cost_kwh: 0.08 }),
      "balanced",
    );
    const g = out.guardrails.find((x) => x.kind === "mining_margin");
    expect(g?.status).toBe("breached");
  });

  it("concentration warning when mode is opportunistic", () => {
    const out = assessBtcTactical(NEUTRAL_INPUTS, "opportunistic");
    const g = out.guardrails.find((x) => x.kind === "concentration");
    expect(g?.status).toBe("warning");
  });

  it("concentration normal when mode is balanced", () => {
    const out = assessBtcTactical(NEUTRAL_INPUTS, "balanced");
    const g = out.guardrails.find((x) => x.kind === "concentration");
    expect(g?.status).toBe("normal");
  });

  it("liquidity is always normal at MVP", () => {
    const out = assessBtcTactical(NEUTRAL_INPUTS, "defensive");
    const g = out.guardrails.find((x) => x.kind === "liquidity");
    expect(g?.status).toBe("normal");
    expect(g?.detail.toLowerCase()).toContain("placeholder");
  });

  it("exactly 4 guardrails, one per kind", () => {
    const out = assessBtcTactical(NEUTRAL_INPUTS, "balanced");
    expect(out.guardrails).toHaveLength(4);
    const kinds = out.guardrails.map((g) => g.kind).sort();
    expect(kinds).toEqual([
      "concentration",
      "liquidity",
      "mining_margin",
      "volatility",
    ]);
  });
});

describe("assessBtcTactical — targetExposurePct", () => {
  it("defensive with no rule armed = 5", () => {
    const out = assessBtcTactical(NEUTRAL_INPUTS, "defensive");
    expect(out.targetExposurePct).toBe(5);
  });

  it("balanced with no rule armed = 12", () => {
    const out = assessBtcTactical(NEUTRAL_INPUTS, "balanced");
    expect(out.targetExposurePct).toBe(12);
  });

  it("opportunistic with no rule armed = 22", () => {
    const out = assessBtcTactical(NEUTRAL_INPUTS, "opportunistic");
    expect(out.targetExposurePct).toBe(22);
  });

  it("opportunistic with R-BTC-3 armed = round(22 * 0.5) = 11", () => {
    const out = assessBtcTactical(
      withInputs({ vol_index: 85 }),
      "opportunistic",
    );
    expect(out.targetExposurePct).toBe(11);
  });

  it("balanced with R-BTC-1 armed = round(12 * 1.10) = 13", () => {
    const out = assessBtcTactical(
      withInputs({ btc_price_change_pct: -25, vol_index: 40 }),
      "balanced",
    );
    expect(out.targetExposurePct).toBe(13);
  });

  it("balanced with R-BTC-2 armed = round(12 * 0.75) = 9", () => {
    const out = assessBtcTactical(
      withInputs({ btc_price_change_pct: 50 }),
      "balanced",
    );
    expect(out.targetExposurePct).toBe(9);
  });

  it("exposure capped at 30 even with cumulative multipliers", () => {
    const out = assessBtcTactical(
      withInputs({ btc_price_change_pct: -25, vol_index: 40 }),
      "opportunistic",
    );
    expect(out.targetExposurePct).toBeLessThanOrEqual(30);
  });

  it("never returns above 30 for any combination", () => {
    const modes: VaultMode[] = ["defensive", "balanced", "opportunistic"];
    const combos: Array<Partial<ScenarioInputs>> = [
      { btc_price_change_pct: -50, vol_index: 10 },
      { btc_price_change_pct: 80, vol_index: 90 },
      { btc_price_change_pct: -30, vol_index: 90 },
      { btc_price_change_pct: 100, vol_index: 10 },
    ];
    for (const mode of modes) {
      for (const c of combos) {
        const out = assessBtcTactical(withInputs(c), mode);
        expect(out.targetExposurePct).toBeLessThanOrEqual(30);
        expect(out.targetExposurePct).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("assessBtcTactical — no forbidden words", () => {
  it("no forbidden word in any condition/action/label/detail across modes and inputs", () => {
    const modes: VaultMode[] = ["defensive", "balanced", "opportunistic"];
    const samples: Array<Partial<ScenarioInputs>> = [
      {},
      { btc_price_change_pct: -40, vol_index: 90 },
      { btc_price_change_pct: 60, vol_index: 50 },
      { hashprice_usd_th_day: 0.04, energy_cost_kwh: 0.08 },
    ];
    for (const mode of modes) {
      for (const s of samples) {
        const out = assessBtcTactical(withInputs(s), mode);
        const texts = [
          ...out.triggers.flatMap((t) => [t.condition, t.action]),
          ...out.guardrails.flatMap((g) => [g.label, g.detail]),
        ];
        for (const text of texts) {
          const lower = text.toLowerCase();
          for (const word of FORBIDDEN) {
            expect(lower).not.toContain(word);
          }
        }
      }
    }
  });
});
