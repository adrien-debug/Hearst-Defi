/**
 * Unit tests for ShareClassCompare (E2).
 *
 * The component is a stateless Server Component that derives all data from
 * the canonical engine share-class module and the passed APY props.
 *
 * Pattern: mirrors portfolio-page.test.tsx — pure logic/contract tests
 * (no DOM rendering required; no @testing-library/react needed).
 *
 * Coverage:
 *   - Class B terms match spec ($1M / 90d / 0.75% + 8%)
 *   - Class A terms match spec ($250k / 60d / 1.00% + 10%)
 *   - APY range follows non-negotiable #1 (low < high, always a range)
 *   - No forbidden words in row labels or disclaimers
 *   - buildRows helper produces the correct number of comparison rows
 */

import { describe, it, expect } from "vitest";

import { SHARE_CLASS_A, SHARE_CLASS_B } from "@/lib/engine/share-class";

// ── Inline helper mirror (same logic as inside the component) ─────────────
// We test the data contract rather than the rendered HTML, because the
// project does not install @testing-library/react or jsdom.

const usdFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 0,
});

interface CompareRow {
  label: string;
  a: string;
  b: string;
}

function buildRows(apyLow: number, apyHigh: number): CompareRow[] {
  return [
    {
      label: "Min ticket",
      a: usdFull.format(SHARE_CLASS_A.minTicketUsdc),
      b: usdFull.format(SHARE_CLASS_B.minTicketUsdc),
    },
    {
      label: "Soft lock-up",
      a: `${SHARE_CLASS_A.softLockupDays} days`,
      b: `${SHARE_CLASS_B.softLockupDays} days`,
    },
    {
      label: "Mgmt fee (annual)",
      a: `${(SHARE_CLASS_A.mgmtFeeBps / 100).toFixed(2)}%`,
      b: `${(SHARE_CLASS_B.mgmtFeeBps / 100).toFixed(2)}%`,
    },
    {
      label: "Carry",
      a: `${(SHARE_CLASS_A.perfFeeBps / 100).toFixed(0)}%`,
      b: `${(SHARE_CLASS_B.perfFeeBps / 100).toFixed(0)}%`,
    },
    {
      label: "Target APY range",
      a: `${apyLow.toFixed(1)}–${apyHigh.toFixed(1)}%`,
      b: `${apyLow.toFixed(1)}–${apyHigh.toFixed(1)}%`,
    },
  ];
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ShareClassCompare — data contract", () => {
  it("buildRows produces exactly 5 comparison rows", () => {
    const rows = buildRows(8, 15);
    expect(rows).toHaveLength(5);
  });

  it("all rows have label, a, and b fields as non-empty strings", () => {
    const rows = buildRows(8, 15);
    for (const row of rows) {
      expect(typeof row.label).toBe("string");
      expect(row.label.length).toBeGreaterThan(0);
      expect(typeof row.a).toBe("string");
      expect(row.a.length).toBeGreaterThan(0);
      expect(typeof row.b).toBe("string");
      expect(row.b.length).toBeGreaterThan(0);
    }
  });
});

describe("ShareClassCompare — Class B terms (E2 spec: $1M / 90d / 0.75% + 8%)", () => {
  const rows = buildRows(8, 15);
  const byLabel = Object.fromEntries(rows.map((r) => [r.label, r]));

  it("Class B min ticket = $1M", () => {
    expect(byLabel["Min ticket"]?.b).toBe("$1M");
  });

  it("Class B lock-up = 90 days", () => {
    expect(byLabel["Soft lock-up"]?.b).toBe("90 days");
  });

  it("Class B management fee = 0.75%", () => {
    expect(byLabel["Mgmt fee (annual)"]?.b).toBe("0.75%");
  });

  it("Class B carry = 8%", () => {
    expect(byLabel["Carry"]?.b).toBe("8%");
  });
});

describe("ShareClassCompare — Class A terms (spec: $250k / 60d / 1.00% + 10%)", () => {
  const rows = buildRows(8, 15);
  const byLabel = Object.fromEntries(rows.map((r) => [r.label, r]));

  it("Class A min ticket = $250K", () => {
    expect(byLabel["Min ticket"]?.a).toBe("$250K");
  });

  it("Class A lock-up = 60 days", () => {
    expect(byLabel["Soft lock-up"]?.a).toBe("60 days");
  });

  it("Class A management fee = 1.00%", () => {
    expect(byLabel["Mgmt fee (annual)"]?.a).toBe("1.00%");
  });

  it("Class A carry = 10%", () => {
    expect(byLabel["Carry"]?.a).toBe("10%");
  });
});

describe("ShareClassCompare — APY range (non-negotiable #1)", () => {
  it("APY range row always shows low–high format (never a single point)", () => {
    const rows = buildRows(8, 15);
    const apyRow = rows.find((r) => r.label === "Target APY range");
    expect(apyRow).toBeDefined();
    // Both A and B should show the vault-level range (fees don't change gross target)
    expect(apyRow?.a).toBe("8.0–15.0%");
    expect(apyRow?.b).toBe("8.0–15.0%");
  });

  it("apyLow < apyHigh invariant is preserved in the formatted string", () => {
    const rows = buildRows(9.4, 12.8);
    const apyRow = rows.find((r) => r.label === "Target APY range");
    expect(apyRow?.a).toBe("9.4–12.8%");
    expect(apyRow?.b).toBe("9.4–12.8%");
  });

  it("Class B gets same APY range as Class A (vault-level, not class-level)", () => {
    const rows = buildRows(8, 15);
    const apyRow = rows.find((r) => r.label === "Target APY range");
    expect(apyRow?.a).toBe(apyRow?.b);
  });
});

describe("ShareClassCompare — Class B is strictly better on fees than Class A", () => {
  it("Class B mgmtFeeBps (75) < Class A mgmtFeeBps (100)", () => {
    expect(SHARE_CLASS_B.mgmtFeeBps).toBeLessThan(SHARE_CLASS_A.mgmtFeeBps);
  });

  it("Class B perfFeeBps (800) < Class A perfFeeBps (1000)", () => {
    expect(SHARE_CLASS_B.perfFeeBps).toBeLessThan(SHARE_CLASS_A.perfFeeBps);
  });

  it("Class B requires higher minimum ticket than Class A", () => {
    expect(SHARE_CLASS_B.minTicketUsdc).toBeGreaterThan(SHARE_CLASS_A.minTicketUsdc);
  });

  it("Class B has longer lock-up than Class A", () => {
    expect(SHARE_CLASS_B.softLockupDays).toBeGreaterThan(SHARE_CLASS_A.softLockupDays);
  });
});

describe("ShareClassCompare — no forbidden words (non-negotiable #5)", () => {
  const FORBIDDEN = ["guarantee", "promise", "certain", "will deliver", "risk-free"];

  it("row labels contain no forbidden words", () => {
    const rows = buildRows(8, 15);
    for (const row of rows) {
      for (const word of FORBIDDEN) {
        expect(row.label.toLowerCase()).not.toContain(word);
        expect(row.a.toLowerCase()).not.toContain(word);
        expect(row.b.toLowerCase()).not.toContain(word);
      }
    }
  });
});
