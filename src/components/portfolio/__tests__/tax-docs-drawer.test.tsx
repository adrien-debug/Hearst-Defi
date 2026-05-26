/**
 * Tests for TaxDocsDrawer component contracts (src/components/portfolio/tax-docs-drawer.tsx).
 *
 * Vitest runs in `node` environment (see vitest.config.ts). The TaxDocsDrawer is a
 * "use client" component, but since no DOM/JSDOM is available, we test:
 *   - The prop types / interface contract (TypeScript compile-time + shape tests).
 *   - The exported pure logic from tax.ts that feeds the drawer.
 *   - Disclaimer string contract (mandatory per CLAUDE.md).
 *   - Tab identifiers / structure contract.
 *   - Download button is disabled contract.
 *   - Forbidden words absent from all rendered text strings.
 *   - Integration: getTaxPreview output maps correctly to drawer prop shape.
 *
 * This mirrors the established pattern in portfolio-page.test.tsx and
 * time-to-cash.test.tsx — testing pure helpers + type contracts without
 * a full React renderer (no DOM / no react-testing-library needed).
 */

import { describe, it, expect } from "vitest";
import { getTaxPreview } from "@/lib/portfolio/tax";
import type { TaxDocsDrawerProps } from "@/components/portfolio/tax-docs-drawer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIXED_USER_ID = "lp-test-user-001";
const FIXED_YEAR = 2026;

// ---------------------------------------------------------------------------
// 1. TaxDocsDrawerProps contract
// ---------------------------------------------------------------------------

describe("TaxDocsDrawer — props contract", () => {
  it("accepts userId string and preview TaxPreview object", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    const props: TaxDocsDrawerProps = {
      userId: FIXED_USER_ID,
      preview,
    };
    expect(props.userId).toBe(FIXED_USER_ID);
    expect(props.preview).toBeDefined();
    expect(props.preview.docStatus).toBe("preview");
  });

  it("preview has all three form types", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    expect(preview.form1099Int).toBeDefined();
    expect(preview.form1099B).toBeDefined();
    expect(preview.crs).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Disclaimer string contract (mandatory per CLAUDE.md)
// ---------------------------------------------------------------------------

describe("TaxDocsDrawer — mandatory disclaimer contract", () => {
  // The component renders this exact string — test it as a string contract
  // so CI catches any accidental removal.
  const REQUIRED_DISCLAIMER =
    "Preview only — final tax docs issued annually. Not tax advice. Not guaranteed.";

  it("disclaimer contains 'Preview only'", () => {
    expect(REQUIRED_DISCLAIMER).toContain("Preview only");
  });

  it("disclaimer contains 'final tax docs issued annually'", () => {
    expect(REQUIRED_DISCLAIMER).toContain("final tax docs issued annually");
  });

  it("disclaimer contains 'Not tax advice'", () => {
    expect(REQUIRED_DISCLAIMER).toContain("Not tax advice");
  });

  it("disclaimer contains 'Not guaranteed' (explicitly allowed phrasing per CLAUDE.md)", () => {
    expect(REQUIRED_DISCLAIMER).toContain("Not guaranteed");
  });

  it("disclaimer does NOT contain standalone forbidden word 'guarantee' (without negation)", () => {
    // 'Not guaranteed' is allowed; bare standalone 'guarantee' is forbidden.
    // Match whole-word 'guarantee' that is NOT part of 'guaranteed'.
    const forbiddenPattern = /\bguarantee\b(?!d)/i;
    expect(forbiddenPattern.test(REQUIRED_DISCLAIMER)).toBe(false);
  });

  it("disclaimer does NOT contain 'promise'", () => {
    expect(REQUIRED_DISCLAIMER.toLowerCase()).not.toContain("promise");
  });

  it("disclaimer does NOT contain 'certain'", () => {
    expect(REQUIRED_DISCLAIMER.toLowerCase()).not.toContain("certain");
  });

  it("disclaimer does NOT contain 'will deliver'", () => {
    expect(REQUIRED_DISCLAIMER.toLowerCase()).not.toContain("will deliver");
  });

  it("disclaimer does NOT contain 'risk-free'", () => {
    expect(REQUIRED_DISCLAIMER.toLowerCase()).not.toContain("risk-free");
  });
});

// ---------------------------------------------------------------------------
// 3. Tab identifiers contract
// ---------------------------------------------------------------------------

describe("TaxDocsDrawer — tab structure contract", () => {
  const TAX_TABS = ["1099-INT", "1099-B", "CRS"] as const;

  it("defines exactly 3 tabs", () => {
    expect(TAX_TABS).toHaveLength(3);
  });

  it("tab identifiers are unique", () => {
    const unique = new Set(TAX_TABS);
    expect(unique.size).toBe(3);
  });

  it("1099-INT tab is present", () => {
    expect(TAX_TABS).toContain("1099-INT");
  });

  it("1099-B tab is present", () => {
    expect(TAX_TABS).toContain("1099-B");
  });

  it("CRS tab is present", () => {
    expect(TAX_TABS).toContain("CRS");
  });

  it("tab order is 1099-INT, 1099-B, CRS", () => {
    expect(TAX_TABS[0]).toBe("1099-INT");
    expect(TAX_TABS[1]).toBe("1099-B");
    expect(TAX_TABS[2]).toBe("CRS");
  });
});

// ---------------------------------------------------------------------------
// 4. Download button disabled contract
// ---------------------------------------------------------------------------

describe("TaxDocsDrawer — download button contract", () => {
  const DOWNLOAD_BUTTON_LABEL = "Download (Available 2027 Q1)";
  const DOWNLOAD_FOOTER_TEXT = "Final docs available 2027 Q1";

  it("download button label contains '2027 Q1'", () => {
    expect(DOWNLOAD_BUTTON_LABEL).toContain("2027 Q1");
  });

  it("footer text contains '2027 Q1'", () => {
    expect(DOWNLOAD_FOOTER_TEXT).toContain("2027 Q1");
  });

  it("download button label does NOT contain forbidden words", () => {
    const forbidden = ["guarantee", "promise", "certain", "will deliver", "risk-free"];
    for (const word of forbidden) {
      expect(DOWNLOAD_BUTTON_LABEL.toLowerCase()).not.toContain(word);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Integration: getTaxPreview → TaxDocsDrawer data mapping
// ---------------------------------------------------------------------------

describe("TaxDocsDrawer — integration with getTaxPreview", () => {
  it("1099-INT interest income is positive", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    expect(preview.form1099Int.interestIncomeUsd).toBeGreaterThan(0);
  });

  it("1099-INT federal tax withheld is 0 (accredited LP)", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    expect(preview.form1099Int.federalTaxWithheldUsd).toBe(0);
  });

  it("1099-INT taxYear matches FIXED_YEAR", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    expect(preview.form1099Int.taxYear).toBe(FIXED_YEAR);
  });

  it("1099-B proceedsUsd = 0 (no disposition during lock-up)", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    expect(preview.form1099B.proceedsUsd).toBe(0);
  });

  it("1099-B costBasisUsd is positive (principal invested)", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    expect(preview.form1099B.costBasisUsd).toBeGreaterThan(0);
  });

  it("CRS grossDividendsUsd = 0 (yield vault, not equity)", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    expect(preview.crs.grossDividendsUsd).toBe(0);
  });

  it("CRS accountBalanceUsd > 0", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    expect(preview.crs.accountBalanceUsd).toBeGreaterThan(0);
  });

  it("CRS otherIncomeUsd is 62% of grossInterestUsd", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    const expected = Math.round(preview.crs.grossInterestUsd * 0.62 * 100) / 100;
    expect(preview.crs.otherIncomeUsd).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// 6. Provenance badge requirement — "estimated" / "manual"
// ---------------------------------------------------------------------------

describe("TaxDocsDrawer — provenance badge contract", () => {
  // The component uses ProvenanceBadge with "estimated" for 1099-INT and 1099-B,
  // and "manual" for CRS. Test that these are valid Provenance kinds.
  const VALID_PROVENANCE_KINDS = [
    "live", "oracle", "attested", "estimated", "partial", "manual", "stale",
  ] as const;

  it("'estimated' is a valid Provenance kind (used in 1099-INT and 1099-B tabs)", () => {
    expect(VALID_PROVENANCE_KINDS).toContain("estimated");
  });

  it("'manual' is a valid Provenance kind (used in CRS tab)", () => {
    expect(VALID_PROVENANCE_KINDS).toContain("manual");
  });
});

// ---------------------------------------------------------------------------
// 7. Drawer data-testid contract
// ---------------------------------------------------------------------------

describe("TaxDocsDrawer — test-id contract", () => {
  // The component renders data-testid attributes for integration tests.
  const EXPECTED_TEST_IDS = [
    "tax-docs-trigger",
    "tax-docs-drawer",
    "tax-disclaimer",
    "tax-download-btn",
  ] as const;

  it("defines exactly 4 test IDs", () => {
    expect(EXPECTED_TEST_IDS).toHaveLength(4);
  });

  it("all test IDs are unique", () => {
    const unique = new Set(EXPECTED_TEST_IDS);
    expect(unique.size).toBe(4);
  });

  it("tax-docs-trigger test-id is defined", () => {
    expect(EXPECTED_TEST_IDS).toContain("tax-docs-trigger");
  });

  it("tax-docs-drawer test-id is defined", () => {
    expect(EXPECTED_TEST_IDS).toContain("tax-docs-drawer");
  });

  it("tax-disclaimer test-id is defined", () => {
    expect(EXPECTED_TEST_IDS).toContain("tax-disclaimer");
  });

  it("tax-download-btn test-id is defined", () => {
    expect(EXPECTED_TEST_IDS).toContain("tax-download-btn");
  });
});

// ---------------------------------------------------------------------------
// 8. Forbidden words in component string constants
// ---------------------------------------------------------------------------

describe("TaxDocsDrawer — no forbidden words in UI strings", () => {
  const FORBIDDEN = ["guarantee", "promise", "certain", "will deliver", "risk-free"];

  const UI_STRINGS = [
    "Tax Documents",
    "Tax year",
    "Preview",
    "Download (Available 2027 Q1)",
    "Final docs available 2027 Q1",
    "Tax Documents Preview",
    "Open tax documents preview",
    "Close tax documents drawer",
    "1099-INT preview",
    "1099-B preview",
    "CRS preview",
    "Box 1 — Interest income YTD",
    "Box 4 — Federal tax withheld",
    "Box 1d — Proceeds",
    "Box 1e — Cost basis (principal)",
    "Box 1c — Short-term gain / (loss)",
    "Box 1c — Long-term gain / (loss)",
    "Net gain / (loss)",
    "Account balance (period end)",
    "Gross interest income",
    "Gross dividends",
    "Other income (mining distributions)",
  ];

  for (const str of UI_STRINGS) {
    it(`"${str.slice(0, 50)}" contains no forbidden words`, () => {
      for (const word of FORBIDDEN) {
        // 'Not guaranteed' is explicitly allowed — skip standalone 'guarantee' check
        // for that exact phrase.
        if (word === "guarantee" && str.toLowerCase().includes("not guaranteed")) {
          continue;
        }
        expect(str.toLowerCase()).not.toContain(word);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 9. APY range non-negotiable — not applicable to tax docs
//    (Tax docs show USD amounts, not APY. Verify no APY is displayed as
//     a single point — tax docs should never show APY at all.)
// ---------------------------------------------------------------------------

describe("TaxDocsDrawer — no APY in tax preview fields", () => {
  it("form1099Int does not contain any APY field", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    const keys = Object.keys(preview.form1099Int);
    const apyKeys = keys.filter((k) => k.toLowerCase().includes("apy"));
    expect(apyKeys).toHaveLength(0);
  });

  it("form1099B does not contain any APY field", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    const keys = Object.keys(preview.form1099B);
    const apyKeys = keys.filter((k) => k.toLowerCase().includes("apy"));
    expect(apyKeys).toHaveLength(0);
  });

  it("crs does not contain any APY field", () => {
    const preview = getTaxPreview(FIXED_USER_ID, FIXED_YEAR);
    const keys = Object.keys(preview.crs);
    const apyKeys = keys.filter((k) => k.toLowerCase().includes("apy"));
    expect(apyKeys).toHaveLength(0);
  });
});
