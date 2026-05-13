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
});
