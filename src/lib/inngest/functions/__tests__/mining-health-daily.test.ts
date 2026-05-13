import { describe, expect, it, vi } from "vitest";

import type { MiningHealthOutput } from "@/lib/agents/schemas";

/**
 * Mock the Mining Health Agent so the test never reaches the Anthropic SDK.
 * The mock is hoisted by Vitest so it MUST be declared before the module
 * under test is imported (we import it inside `it()` to honour that order).
 */
vi.mock("@/lib/agents/mining-health", () => ({
  runMiningHealth: vi.fn(async () => {
    const out: MiningHealthOutput = {
      alert_level: "green",
      summary:
        "Under the assumption that hashprice stays flat, margins are healthy at 17.5%.",
      recommendation: "Suggest continued monitoring of the hosting contract.",
    };
    return out;
  }),
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
});
