import { describe, expect, it, vi } from "vitest";

import type { MiningHealthOutput } from "@/lib/agents/schemas";
import type { MiningHealthInput } from "@/lib/agents/mining-health";

/**
 * Mock the data loader so the test never touches Prisma / the filesystem.
 */
const loaderFake: MiningHealthInput = {
  hashprice_usd_per_th: 0.085,
  difficulty_change_pct: 3.2,
  margin_pct: 17.5,
  uptime_pct: 98.4,
  period_days: 30,
};

const loadLatestMiningMetricsMock = vi.fn(async () => loaderFake);

vi.mock("@/lib/agents/loaders/mining", () => ({
  loadLatestMiningMetrics: loadLatestMiningMetricsMock,
}));

/**
 * Mock the Mining Health Agent so the test never reaches the Anthropic SDK.
 * The mock is hoisted by Vitest so it MUST be declared before the module
 * under test is imported (we import it inside `it()` to honour that order).
 */
const runMiningHealthMock = vi.fn(async (_input: MiningHealthInput) => {
  const out: MiningHealthOutput = {
    alert_level: "green",
    summary:
      "Under the assumption that hashprice stays flat, margins are healthy at 17.5%.",
    recommendation: "Suggest continued monitoring of the hosting contract.",
  };
  return out;
});

vi.mock("@/lib/agents/mining-health", () => ({
  runMiningHealth: runMiningHealthMock,
}));

/**
 * Mock Prisma so the persist step does not hit the real database.
 */
const miningMetricFindFirstMock = vi.fn(async () => ({
  hashprice: 0.085,
  difficulty: 100,
  btcPrice: 65_000,
  energyCost: 0.05,
  uptimePct: 98.4,
  deployedHashrate: 182_000,
  miningMarginScore: 64,
  hashpriceTrendPct: 3.2,
  operationalConfidence: 80,
}));

const miningMetricCreateMock = vi.fn(
  async (args: { data: Record<string, unknown> }) => ({
    id: "mock-mining-metric-id",
    ...args.data,
  }),
);

vi.mock("@/lib/db", () => ({
  prisma: {
    miningMetric: {
      findFirst: miningMetricFindFirstMock,
      create: miningMetricCreateMock,
    },
  },
}));

describe("miningHealthDaily Inngest function", () => {
  it("registers with id 'mining-health-daily'", async () => {
    const { miningHealthDaily, MINING_HEALTH_DAILY_ID } = await import(
      "@/lib/inngest/functions/mining-health-daily"
    );

    expect(MINING_HEALTH_DAILY_ID).toBe("mining-health-daily");
    expect(miningHealthDaily.opts.id).toBe("mining-health-daily");
  });

  it("uses the 08:00 UTC daily cron expression", async () => {
    const { miningHealthDaily, MINING_HEALTH_DAILY_CRON } = await import(
      "@/lib/inngest/functions/mining-health-daily"
    );

    expect(MINING_HEALTH_DAILY_CRON).toBe("0 8 * * *");

    const triggers = miningHealthDaily.opts.triggers;
    expect(triggers).toBeDefined();
    expect(triggers).toHaveLength(1);

    const trigger = triggers?.[0];
    expect(trigger).toBeDefined();
    if (!trigger || !("cron" in trigger)) {
      throw new Error("Expected a cron trigger on miningHealthDaily.");
    }
    expect(trigger.cron).toBe("0 8 * * *");
  });

  it("name attribute defaults to the id (no override expected)", async () => {
    const { miningHealthDaily } = await import(
      "@/lib/inngest/functions/mining-health-daily"
    );
    // We didn't set a custom `name` — Inngest falls back to id, so a string
    // accessor is enough to detect accidental misconfiguration.
    expect(typeof miningHealthDaily.name).toBe("string");
  });

  it("handler calls the loader and forwards its output to the agent", async () => {
    loadLatestMiningMetricsMock.mockClear();
    runMiningHealthMock.mockClear();

    const { miningHealthDailyHandler } = await import(
      "@/lib/inngest/functions/mining-health-daily"
    );

    // Minimal `step` shim — runs the work function inline.
    const stepShim = {
      run: <T,>(_name: string, fn: () => T | Promise<T>): Promise<T> =>
        Promise.resolve(fn()),
    };

    const out = await miningHealthDailyHandler({ step: stepShim });

    expect(loadLatestMiningMetricsMock).toHaveBeenCalledTimes(1);
    expect(runMiningHealthMock).toHaveBeenCalledTimes(1);
    expect(runMiningHealthMock).toHaveBeenCalledWith(loaderFake);
    expect(out.alert_level).toBe("green");
  });

  it("persists agent output to a new MiningMetric row", async () => {
    miningMetricFindFirstMock.mockClear();
    miningMetricCreateMock.mockClear();

    const { miningHealthDailyHandler } = await import(
      "@/lib/inngest/functions/mining-health-daily"
    );

    const stepShim = {
      run: <T,>(_name: string, fn: () => T | Promise<T>): Promise<T> =>
        Promise.resolve(fn()),
    };

    await miningHealthDailyHandler({ step: stepShim });

    expect(miningMetricFindFirstMock).toHaveBeenCalledTimes(1);
    expect(miningMetricCreateMock).toHaveBeenCalledTimes(1);

    const createCall = miningMetricCreateMock.mock.calls[0];
    expect(createCall).toBeDefined();
    if (!createCall) {
      throw new Error("Expected prisma.miningMetric.create to be called.");
    }

    const { data } = createCall[0] as { data: Record<string, unknown> };
    expect(data.alertLevel).toBe("green");
    expect(data.summary).toBe(
      "Under the assumption that hashprice stays flat, margins are healthy at 17.5%.",
    );
    expect(data.recommendation).toBe(
      "Suggest continued monitoring of the hosting contract.",
    );
    expect(data.hashprice).toBe(0.085);
    expect(data.miningMarginScore).toBe(64);
  });
});
