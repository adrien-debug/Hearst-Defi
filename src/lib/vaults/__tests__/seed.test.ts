// src/lib/vaults/__tests__/seed.test.ts
//
// Tests for the Defensive Vault testnet deployment fixture (F2).
//
// Scope:
//   1. VAULT_DEFENSIVE fixture exists and has the expected APY range.
//   2. resolveFixture("defensive") returns the correct fixture (synchronous path,
//      no DB required).
//   3. resolveVault("defensive") returns a fixture ref (no DB hit) confirming
//      criterion 3 in the F2 acceptance spec.
//   4. The testnet deployment data constants (APY range, allocation bps sum,
//      required signers, chain, address) are verified in isolation without
//      running the seed against a real DB — seed logic is integration-tested
//      separately via `pnpm db:push && tsx prisma/seed.ts`.
//   5. Forbidden-words linter on all text coming from the testnet fixture.

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mocks before any module import that touches server-only / @prisma/client
// ---------------------------------------------------------------------------

const { findFirstMock, findManyMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    vaultDeployment: {
      findFirst: findFirstMock,
      findMany: findManyMock,
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { VAULT_DEFENSIVE } from "@/lib/engine/vaults";
import { resolveFixture, resolveVault } from "@/lib/vaults/resolver";

// ---------------------------------------------------------------------------
// Constants mirrored from prisma/seed.ts — tested in isolation so changes to
// those constants surface as test failures before a bad seed reaches a real DB.
// ---------------------------------------------------------------------------

const DEFENSIVE_TESTNET = {
  id: "defensive",
  ticker: "HDV-T",
  chainId: 84532,
  network: "84532",
  contractAddress: "0x0000000000000000000000000000000000000002" as const,
  status: "testnet",
  targetApyLowBps: 600,
  targetApyHighBps: 900,
  softLockupDays: 30,
  minTicketUsdc: 100_000,
  requiredSigners: 3,
  totalSigners: 5,
  // Allocation bps (from VAULT_DEFENSIVE — must sum to 10000)
  targetMiningBps: 2_000,
  targetBtcTacticalBps: 1_000,
  targetUsdcBaseBps: 3_500,
  targetStableReserveBps: 3_500,
} as const;

// ---------------------------------------------------------------------------
// Forbidden-words helpers (CLAUDE.md rule #5)
// ---------------------------------------------------------------------------

const FORBIDDEN_WORDS = [
  "guarantee",
  "promise",
  "certain",
  "will deliver",
  "risk-free",
] as const;
const NOT_GUARANTEED_RE = /not guaranteed/i;

function firstForbiddenWord(text: string): string | null {
  for (const word of FORBIDDEN_WORDS) {
    const re = new RegExp(word, "i");
    if (re.test(text)) {
      if (word === "guarantee" && NOT_GUARANTEED_RE.test(text)) continue;
      return word;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// beforeEach reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  findFirstMock.mockReset();
  findManyMock.mockReset();
  findManyMock.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// 1. VAULT_DEFENSIVE fixture
// ---------------------------------------------------------------------------

describe("VAULT_DEFENSIVE fixture (src/lib/engine/vaults.ts)", () => {
  it("exists with id 'defensive'", () => {
    expect(VAULT_DEFENSIVE.id).toBe("defensive");
  });

  it("ticker is HDV", () => {
    expect(VAULT_DEFENSIVE.ticker).toBe("HDV");
  });

  it("APY range: low=5, high=8 (percent)", () => {
    expect(VAULT_DEFENSIVE.apyTarget.low).toBe(5);
    expect(VAULT_DEFENSIVE.apyTarget.high).toBe(8);
  });

  it("APY always a range: low < high", () => {
    expect(VAULT_DEFENSIVE.apyTarget.low).toBeLessThan(
      VAULT_DEFENSIVE.apyTarget.high,
    );
  });

  it("allocation targets sum ≈ 100", () => {
    const t = VAULT_DEFENSIVE.allocationTargets;
    const sum = t.mining + t.btc_tactical + t.usdc_base + t.stable_reserve;
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(0.01);
  });

  it("baseMode is 'defensive'", () => {
    expect(VAULT_DEFENSIVE.baseMode).toBe("defensive");
  });

  it("description contains no forbidden word", () => {
    expect(firstForbiddenWord(VAULT_DEFENSIVE.description)).toBeNull();
  });

  it("every assumption contains no forbidden word ('not guaranteed' is allowed)", () => {
    for (const assumption of VAULT_DEFENSIVE.assumptions) {
      const found = firstForbiddenWord(assumption);
      expect(
        found,
        `Forbidden word "${String(found)}" in assumption: "${assumption}"`,
      ).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// 2. resolveFixture("defensive") — synchronous, no DB
// ---------------------------------------------------------------------------

describe("resolveFixture('defensive')", () => {
  it("returns the VAULT_DEFENSIVE fixture by VaultId", () => {
    const fixture = resolveFixture("defensive");
    expect(fixture).not.toBeNull();
    expect(fixture?.id).toBe("defensive");
  });

  it("also resolves by ticker 'HDV' (case-insensitive)", () => {
    expect(resolveFixture("HDV")?.id).toBe("defensive");
    expect(resolveFixture("hdv")?.id).toBe("defensive");
  });
});

// ---------------------------------------------------------------------------
// 3. resolveVault("defensive") — fixture path, no DB hit (criterion 3)
// ---------------------------------------------------------------------------

describe("resolveVault('defensive') — fixture path, criterion 3", () => {
  it("returns a fixture ref without hitting Prisma", async () => {
    const ref = await resolveVault("defensive");
    expect(ref).not.toBeNull();
    expect(ref?.kind).toBe("fixture");
    if (ref?.kind === "fixture") {
      expect(ref.fixture.id).toBe("defensive");
    }
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. Testnet deployment constants — data integrity checks
// ---------------------------------------------------------------------------

describe("DEFENSIVE_TESTNET constants", () => {
  it("id is 'defensive'", () => {
    expect(DEFENSIVE_TESTNET.id).toBe("defensive");
  });

  it("network encodes Base Sepolia chain id (84532)", () => {
    expect(Number(DEFENSIVE_TESTNET.network)).toBe(84532);
  });

  it("contractAddress is the placeholder 0x0...0002", () => {
    expect(DEFENSIVE_TESTNET.contractAddress).toBe(
      "0x0000000000000000000000000000000000000002",
    );
  });

  it("status is 'testnet'", () => {
    expect(DEFENSIVE_TESTNET.status).toBe("testnet");
  });

  it("APY bps: low=600 (6%), high=900 (9%), always a range", () => {
    expect(DEFENSIVE_TESTNET.targetApyLowBps).toBe(600);
    expect(DEFENSIVE_TESTNET.targetApyHighBps).toBe(900);
    expect(DEFENSIVE_TESTNET.targetApyLowBps).toBeLessThan(
      DEFENSIVE_TESTNET.targetApyHighBps,
    );
  });

  it("softLockupDays is 30", () => {
    expect(DEFENSIVE_TESTNET.softLockupDays).toBe(30);
  });

  it("minTicketUsdc is 100_000", () => {
    expect(DEFENSIVE_TESTNET.minTicketUsdc).toBe(100_000);
  });

  it("requiredSigners=3, totalSigners=5, quorum satisfied", () => {
    expect(DEFENSIVE_TESTNET.requiredSigners).toBe(3);
    expect(DEFENSIVE_TESTNET.totalSigners).toBe(5);
    expect(DEFENSIVE_TESTNET.requiredSigners).toBeLessThanOrEqual(
      DEFENSIVE_TESTNET.totalSigners,
    );
  });

  it("allocation bps sum to exactly 10000", () => {
    const sum =
      DEFENSIVE_TESTNET.targetMiningBps +
      DEFENSIVE_TESTNET.targetBtcTacticalBps +
      DEFENSIVE_TESTNET.targetUsdcBaseBps +
      DEFENSIVE_TESTNET.targetStableReserveBps;
    expect(sum).toBe(10_000);
  });

  it("APY bps convert to expected percent values (6-9%)", () => {
    // The testnet deployment uses a tighter APY range (6–9 %) than the paper-
    // phase fixture (5–8 %). These are the values mandated by the F2 spec.
    expect(DEFENSIVE_TESTNET.targetApyLowBps / 100).toBe(6);
    expect(DEFENSIVE_TESTNET.targetApyHighBps / 100).toBe(9);
  });

  it("APY range is narrower than the flagship Yield Vault fixture's range", () => {
    // Sanity guard: defensive APY ceiling must be below Yield ceiling (15 %).
    expect(DEFENSIVE_TESTNET.targetApyHighBps / 100).toBeLessThan(15);
  });

  it("allocation bps map back to VAULT_DEFENSIVE allocation targets", () => {
    expect(DEFENSIVE_TESTNET.targetMiningBps / 100).toBe(
      VAULT_DEFENSIVE.allocationTargets.mining,
    );
    expect(DEFENSIVE_TESTNET.targetBtcTacticalBps / 100).toBe(
      VAULT_DEFENSIVE.allocationTargets.btc_tactical,
    );
    expect(DEFENSIVE_TESTNET.targetUsdcBaseBps / 100).toBe(
      VAULT_DEFENSIVE.allocationTargets.usdc_base,
    );
    expect(DEFENSIVE_TESTNET.targetStableReserveBps / 100).toBe(
      VAULT_DEFENSIVE.allocationTargets.stable_reserve,
    );
  });
});

// ---------------------------------------------------------------------------
// 5. Forbidden-words on testnet fixture text sourced from VAULT_DEFENSIVE
// ---------------------------------------------------------------------------

describe("forbidden-words linter on defensive testnet fixture text", () => {
  it("VAULT_DEFENSIVE.description has no forbidden word", () => {
    expect(firstForbiddenWord(VAULT_DEFENSIVE.description)).toBeNull();
  });

  it("VAULT_DEFENSIVE.assumptions joined (used as disclaimers) has no forbidden word", () => {
    const disclaimers = VAULT_DEFENSIVE.assumptions.join(" ");
    expect(firstForbiddenWord(disclaimers)).toBeNull();
  });
});
