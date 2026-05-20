import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Integration test for POST /api/backtest/run.
 *
 * We exercise the route handler directly (no HTTP server) so the test runs
 * under Vitest's node environment. External seams are mocked at the module
 * boundary:
 *   - `@/lib/auth/require-auth` → controllable userId / failure
 *   - `@/lib/rate-limit`        → controllable allow/deny
 *   - `@/lib/db`                → in-memory prisma stub (no real DB hit)
 *
 * The engine itself is NOT mocked — we want the snapshot-canonical output
 * to flow through, proving the API faithfully exposes runBacktest().
 */

interface CreatedRow {
  id: string;
  data: Record<string, unknown>;
}

const created: CreatedRow[] = [];

vi.mock("@/lib/db", () => ({
  prisma: {
    backtestRun: {
      create: vi.fn(async (args: { data: Record<string, unknown>; select?: unknown }) => {
        const id = `btr_${created.length + 1}`;
        created.push({ id, data: args.data });
        return { id };
      }),
    },
  },
}));

const requireAuthMock = vi.fn();
vi.mock("@/lib/auth/require-auth", () => ({
  requireAuth: () => requireAuthMock(),
}));

const assertRateLimitMock = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  assertRateLimit: (id: string, max: number, windowMs: number) =>
    assertRateLimitMock(id, max, windowMs),
}));

// Import AFTER mocks so the route picks them up.
const { POST } = await import("@/app/api/backtest/run/route");

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/backtest/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/backtest/run", () => {
  beforeEach(() => {
    created.length = 0;
    requireAuthMock.mockReset();
    assertRateLimitMock.mockReset();
    // Default: auth ok, rate-limit ok.
    requireAuthMock.mockResolvedValue({ userId: "user_test_1" });
    assertRateLimitMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Case A: valid input — 200, persisted, coherent output", async () => {
    // bear_2022 is a 12-month canonical period from the snapshot test.
    // (etf_halving_2024 is the 18-month/spec one; we still exercise a full
    // canonical key here so output coherence is verifiable.)
    const res = await POST(
      makeReq({ key: "bear_2022" }) as unknown as Parameters<typeof POST>[0],
    );

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      id: string | null;
      output: {
        key: string;
        initialCapital: number;
        endingValue: number;
        totalReturnPct: number;
        monthlySeries: Array<{ month: string; valueUsdc: number }>;
        hearstRulesMode: boolean;
        assumptions: string[];
      };
    };

    expect(body.id).toBe("btr_1");
    expect(body.output.key).toBe("bear_2022");
    expect(body.output.initialCapital).toBe(1_000_000);
    expect(body.output.monthlySeries.length).toBe(12);
    expect(body.output.hearstRulesMode).toBe(true);
    expect(body.output.assumptions.length).toBeGreaterThan(0);
    // Persistence happened with userId + required fields.
    expect(created).toHaveLength(1);
    const row = created[0];
    expect(row).toBeDefined();
    if (!row) return;
    expect(row.data.userId).toBe("user_test_1");
    expect(row.data.backtestKey).toBe("bear_2022");
    expect(row.data.rulesMode).toBe("hearst_rules");
    expect(typeof row.data.monthlySeries).toBe("string");
  });

  it("Case B: invalid input — 400", async () => {
    const res = await POST(
      makeReq({ key: "not_a_real_key" }) as unknown as Parameters<typeof POST>[0],
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues?: unknown[] };
    expect(body.error).toMatch(/invalid/i);
    expect(created).toHaveLength(0);
  });

  it("Case C: unauthenticated — 401", async () => {
    requireAuthMock.mockRejectedValueOnce(new Error("Authentication required. Please log in."));

    const res = await POST(
      makeReq({ key: "bear_2022" }) as unknown as Parameters<typeof POST>[0],
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/authentication/i);
    // Rate-limit must not be consulted on a failed auth.
    expect(assertRateLimitMock).not.toHaveBeenCalled();
    expect(created).toHaveLength(0);
  });

  it("Case D: rate-limit on 6th call — 429 with Retry-After", async () => {
    // First 5 calls allowed, 6th throws.
    let callCount = 0;
    assertRateLimitMock.mockImplementation(async () => {
      callCount += 1;
      if (callCount > 5) {
        throw new Error("Rate limit exceeded. Try again in 42s.");
      }
    });

    for (let i = 0; i < 5; i++) {
      const ok = await POST(
        makeReq({ key: "bear_2022" }) as unknown as Parameters<typeof POST>[0],
      );
      expect(ok.status).toBe(200);
    }

    const sixth = await POST(
      makeReq({ key: "bear_2022" }) as unknown as Parameters<typeof POST>[0],
    );
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get("Retry-After")).toBe("60");
    const body = (await sixth.json()) as { error: string };
    expect(body.error).toMatch(/trop de requêtes|too many|rate/i);

    // Rate-limit asserted with the 5/min/userId tuple.
    expect(assertRateLimitMock).toHaveBeenLastCalledWith(
      "backtest-run:user_test_1",
      5,
      60_000,
    );
  });
});
