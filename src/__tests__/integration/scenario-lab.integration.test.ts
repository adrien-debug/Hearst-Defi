import { beforeEach, describe, expect, it, vi } from "vitest";

import { runScenario, getPresetInputs } from "@/lib/engine/scenario";
import { runBacktest } from "@/lib/engine/backtest";
import type { Preset, ScenarioInputs } from "@/lib/engine/types";

describe("Scenario Lab integration", () => {
  it("runs a base scenario end-to-end", () => {
    const inputs = getPresetInputs("base");
    const result = runScenario(inputs, { preset: "base", now: new Date() });

    expect(result.apy_range.low).toBeGreaterThan(0);
    expect(result.apy_range.high).toBeGreaterThan(result.apy_range.low);
    expect(result.allocations.length).toBe(4);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it("runs all presets without throwing", () => {
    const presets: Preset[] = ["base", "btc_bear", "btc_bull", "mining_compression", "extreme_stress"];
    for (const preset of presets) {
      const inputs = getPresetInputs(preset);
      expect(() => runScenario(inputs, { preset, now: new Date() })).not.toThrow();
    }
  });

  it("runs a backtest end-to-end", () => {
    const result = runBacktest("bear_2022", { now: new Date() });

    expect(result.initialCapital).toBe(1_000_000);
    expect(result.monthlySeries.length).toBeGreaterThan(0);
    expect(result.numRebalances).toBeGreaterThanOrEqual(0);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it("respects input bounds", () => {
    const badInputs: ScenarioInputs = {
      btc_price_change_pct: 500,
      hashprice_usd_th_day: 0.085,
      energy_cost_kwh: 0.045,
      stable_apy_pct: 4.5,
      vol_index: 45,
    };

    // The engine itself does not throw on out-of-bounds values;
    // the Server Action layer (`assertBounds`) guards that.
    // Here we verify the engine accepts the input and produces a result.
    const result = runScenario(badInputs, { now: new Date() });
    expect(result).toBeDefined();
  });
});

/* -------------------------------------------------------------------------- */
/* POST /api/scenario/run — route handler integration                          */
/* -------------------------------------------------------------------------- */

// requireAuth is mocked per-test to control the 401 path.
const requireAuthMock = vi.fn();
vi.mock("@/lib/auth/require-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

// assertRateLimit is mocked to a no-op so the bucket doesn't leak across tests.
vi.mock("@/lib/rate-limit", () => ({
  assertRateLimit: vi.fn().mockResolvedValue(undefined),
}));

// runScenarioNarrative is mocked so we don't hit the Anthropic SDK; we drive
// success/failure behaviour per-test through the mock implementation.
const runScenarioNarrativeMock = vi.fn();
vi.mock("@/lib/agents/scenario-narrative", () => ({
  runScenarioNarrative: (...args: unknown[]) => runScenarioNarrativeMock(...args),
}));

// Prisma is mocked so the route's DB writes don't touch a real database.
const createMock = vi.fn();
const updateMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    scenarioRun: {
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
  },
}));

const VALID_INPUTS: ScenarioInputs = {
  btc_price_change_pct: 0,
  hashprice_usd_th_day: 0.085,
  energy_cost_kwh: 0.045,
  stable_apy_pct: 4.5,
  vol_index: 45,
};

const NARRATIVE_FIXTURE = {
  narrative_md:
    "Under the stated assumption that hashprice remains around 0.085 USD/TH/day, the vault projects an APY range that balances mining cashflow with stable yield exposure.",
  risk_warning:
    "Projections are conditional on stated assumptions and are not guaranteed.",
  confidence: "medium" as const,
  key_drivers: ["mining margin", "stable APY", "volatility regime"],
};

async function callPost(body: unknown): Promise<Response> {
  // Dynamic import so module-level mocks are wired BEFORE the route loads.
  const { POST } = await import("@/app/api/scenario/run/route");
  const req = new Request("http://localhost/api/scenario/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // The route signature takes NextRequest; the structural subset we use
  // (`req.json()`) is identical on the standard Request, so the cast is safe
  // for testing.
  return POST(req as unknown as Parameters<typeof POST>[0]);
}

describe("POST /api/scenario/run", () => {
  beforeEach(() => {
    requireAuthMock.mockReset();
    runScenarioNarrativeMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();

    createMock.mockResolvedValue({ id: "run_test_123" });
    updateMock.mockResolvedValue(undefined);
  });

  it("A. valid input → 200, ScenarioRun persisted, narrative present", async () => {
    requireAuthMock.mockResolvedValue({ userId: "user_a" });
    runScenarioNarrativeMock.mockResolvedValue(NARRATIVE_FIXTURE);

    const res = await callPost({ inputs: VALID_INPUTS, scenarioId: "base" });

    expect(res.status).toBe(200);
    const payload = (await res.json()) as {
      id: string;
      output: { apy_range: { low: number; high: number } };
      narrative: typeof NARRATIVE_FIXTURE | null;
    };
    expect(payload.id).toBe("run_test_123");
    expect(payload.output.apy_range.high).toBeGreaterThan(
      payload.output.apy_range.low,
    );
    expect(payload.narrative).not.toBeNull();
    expect(payload.narrative?.narrative_md).toContain("assumption");

    // ScenarioRun.create called with the authenticated userId + JSON payloads.
    expect(createMock).toHaveBeenCalledTimes(1);
    const createArgs = createMock.mock.calls[0]?.[0] as {
      data: { userId: string; inputs: string; outputs: string; status: string };
    };
    expect(createArgs.data.userId).toBe("user_a");
    expect(createArgs.data.status).toBe("completed");
    expect(() => JSON.parse(createArgs.data.inputs)).not.toThrow();
    expect(() => JSON.parse(createArgs.data.outputs)).not.toThrow();

    // Update persists the narrative fields on the same run id.
    expect(updateMock).toHaveBeenCalledTimes(1);
    const updateArgs = updateMock.mock.calls[0]?.[0] as {
      where: { id: string };
      data: { narrative: string; riskWarning: string; confidence: string };
    };
    expect(updateArgs.where.id).toBe("run_test_123");
    expect(updateArgs.data.narrative).toBe(NARRATIVE_FIXTURE.narrative_md);
    expect(updateArgs.data.confidence).toBe("medium");
  });

  it("B. invalid input (slider out of bounds) → 400 with issues", async () => {
    requireAuthMock.mockResolvedValue({ userId: "user_b" });

    const res = await callPost({
      inputs: { ...VALID_INPUTS, vol_index: 500 },
    });

    expect(res.status).toBe(400);
    const payload = (await res.json()) as {
      error: string;
      issues: Array<{ path: string; message: string }>;
    };
    expect(payload.error).toBe("Invalid request body");
    expect(payload.issues.length).toBeGreaterThan(0);
    expect(payload.issues.some((i) => i.path.includes("vol_index"))).toBe(true);

    // No DB writes, no agent call.
    expect(createMock).not.toHaveBeenCalled();
    expect(runScenarioNarrativeMock).not.toHaveBeenCalled();
  });

  it("C. unauthenticated request → 401, no engine or DB call", async () => {
    requireAuthMock.mockRejectedValue(
      new Error("Authentication required. Please log in."),
    );

    const res = await callPost({ inputs: VALID_INPUTS });

    expect(res.status).toBe(401);
    const payload = (await res.json()) as { error: string };
    expect(payload.error).toBe("Authentication required");
    expect(createMock).not.toHaveBeenCalled();
    expect(runScenarioNarrativeMock).not.toHaveBeenCalled();
  });

  it("D. narrative agent failure → 200 with narrative=null (graceful degradation)", async () => {
    requireAuthMock.mockResolvedValue({ userId: "user_d" });
    runScenarioNarrativeMock.mockRejectedValue(
      new Error("anthropic timeout"),
    );

    const res = await callPost({ inputs: VALID_INPUTS, scenarioId: "custom" });

    expect(res.status).toBe(200);
    const payload = (await res.json()) as {
      id: string;
      output: { apy_range: { low: number; high: number } };
      narrative: unknown;
    };
    expect(payload.id).toBe("run_test_123");
    expect(payload.narrative).toBeNull();
    expect(payload.output.apy_range.high).toBeGreaterThan(
      payload.output.apy_range.low,
    );

    // Engine output IS persisted; narrative update is skipped on agent failure.
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
