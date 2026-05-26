/**
 * Tests for AllocationDonut — flat (1-ring) and hierarchical (2-ring) modes.
 *
 * We render to a string via React's renderToStaticMarkup so there's no DOM
 * dependency and the test environment stays `node` (no jsdom needed).
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AllocationDonut } from "../dashboard-charts";
import type {
  AllocationSegment,
  AllocationDonutProps,
} from "../dashboard-charts";

// ── helpers ──────────────────────────────────────────────────────────────────

function render(props: AllocationDonutProps): string {
  return renderToStaticMarkup(<AllocationDonut {...props} />);
}

// ── 1. Flat render (no positions) ─────────────────────────────────────────────

describe("AllocationDonut — flat mode (1 ring)", () => {
  const flatSegments: AllocationSegment[] = [
    { bucket: "mining", pct: 62 },
    { bucket: "btc_tactical", pct: 18 },
    { bucket: "usdc_base", pct: 12 },
    { bucket: "stable_reserve", pct: 8 },
  ];

  it("renders without crashing", () => {
    const html = render({ segments: flatSegments, ariaLabel: "Allocation flat" });
    expect(html).toContain("<svg");
  });

  it("renders exactly 4 inner slices (one per bucket)", () => {
    const html = render({ segments: flatSegments, ariaLabel: "Allocation flat" });
    const matches = html.match(/alloc-inner-slice/g);
    expect(matches).toHaveLength(4);
  });

  it("does NOT render any outer ring slices", () => {
    const html = render({ segments: flatSegments, ariaLabel: "Allocation flat" });
    expect(html).not.toContain("alloc-outer-slice");
    expect(html).not.toContain("alloc-track-outer");
  });

  it("includes an SVG <title> mentioning bucket count", () => {
    const html = render({ segments: flatSegments, ariaLabel: "Allocation flat" });
    expect(html).toContain("4 buckets");
  });
});

// ── 2. Hierarchical render (with positions) ───────────────────────────────────

describe("AllocationDonut — hierarchical mode (2 rings)", () => {
  const hierSegments: AllocationSegment[] = [
    {
      bucket: "mining",
      pct: 62,
      valueUsdc: 15252000,
      positions: [
        { label: "Farm Alpha", pct: 28, valueUsdc: 6888000 },
        { label: "Farm Beta", pct: 22, valueUsdc: 5412000 },
        { label: "Farm Gamma", pct: 12, valueUsdc: 2952000 },
      ],
    },
    {
      bucket: "btc_tactical",
      pct: 18,
      valueUsdc: 4428000,
      positions: [
        { label: "Long BTC", pct: 12, valueUsdc: 2952000 },
        { label: "Hedge", pct: 6, valueUsdc: 1476000 },
      ],
    },
    { bucket: "usdc_base", pct: 12 },
    { bucket: "stable_reserve", pct: 8 },
  ];

  it("renders without crashing", () => {
    const html = render({ segments: hierSegments, ariaLabel: "Allocation hierarchical" });
    expect(html).toContain("<svg");
  });

  it("renders inner ring slices (1 per bucket)", () => {
    const html = render({ segments: hierSegments, ariaLabel: "Allocation hierarchical" });
    const inner = html.match(/alloc-inner-slice/g);
    expect(inner).toHaveLength(4);
  });

  it("renders outer ring slices (1 per position)", () => {
    const html = render({ segments: hierSegments, ariaLabel: "Allocation hierarchical" });
    // 3 (mining) + 2 (btc_tactical) = 5 outer slices
    const outer = html.match(/alloc-outer-slice/g);
    expect(outer).toHaveLength(5);
  });

  it("renders the outer track background circle", () => {
    const html = render({ segments: hierSegments, ariaLabel: "Allocation hierarchical" });
    expect(html).toContain("alloc-track-outer");
  });

  it("includes an SVG <title> mentioning buckets AND positions", () => {
    const html = render({ segments: hierSegments, ariaLabel: "Allocation hierarchical" });
    expect(html).toContain("4 buckets");
    expect(html).toContain("5 positions");
  });

  it("outer slices carry correct data-bucket attribute", () => {
    const html = render({ segments: hierSegments, ariaLabel: "Allocation hierarchical" });
    // Mining outer slices should reference mining bucket
    expect(html).toContain('data-bucket="mining"');
    expect(html).toContain('data-bucket="btc_tactical"');
  });

  it("outer slices carry data-label attribute", () => {
    const html = render({ segments: hierSegments, ariaLabel: "Allocation hierarchical" });
    expect(html).toContain('data-label="Farm Alpha"');
    expect(html).toContain('data-label="Long BTC"');
    expect(html).toContain('data-label="Hedge"');
  });

  it("outer slices have strokeOpacity 0.6", () => {
    const html = render({ segments: hierSegments, ariaLabel: "Allocation hierarchical" });
    // Every outer slice should dim the stroke
    const opacities = html.match(/stroke-opacity="0\.6"/g);
    // 5 outer slices
    expect(opacities).toHaveLength(5);
  });
});

// ── 3. Sum validation ─────────────────────────────────────────────────────────

describe("AllocationDonut — position pct sum validation", () => {
  it("positions under a bucket sum to the bucket pct (mining example)", () => {
    const mining: AllocationSegment = {
      bucket: "mining",
      pct: 62,
      positions: [
        { label: "Farm Alpha", pct: 28, valueUsdc: 0 },
        { label: "Farm Beta", pct: 22, valueUsdc: 0 },
        { label: "Farm Gamma", pct: 12, valueUsdc: 0 },
      ],
    };
    const sum = mining.positions!.reduce((acc, p) => acc + p.pct, 0);
    expect(sum).toBe(mining.pct);
  });

  it("positions under btc_tactical sum to bucket pct", () => {
    const btc: AllocationSegment = {
      bucket: "btc_tactical",
      pct: 18,
      positions: [
        { label: "Long BTC", pct: 12, valueUsdc: 0 },
        { label: "Hedge", pct: 6, valueUsdc: 0 },
      ],
    };
    const sum = btc.positions!.reduce((acc, p) => acc + p.pct, 0);
    expect(sum).toBe(btc.pct);
  });
});

// ── 4. Colours per bucket ─────────────────────────────────────────────────────

describe("AllocationDonut — bucket colours (token references)", () => {
  const singleMining: AllocationSegment[] = [
    {
      bucket: "mining",
      pct: 100,
      positions: [{ label: "Only Farm", pct: 100, valueUsdc: 0 }],
    },
  ];
  const singleBtc: AllocationSegment[] = [
    {
      bucket: "btc_tactical",
      pct: 100,
      positions: [{ label: "Full BTC", pct: 100, valueUsdc: 0 }],
    },
  ];
  const singleUsdc: AllocationSegment[] = [
    { bucket: "usdc_base", pct: 100 },
  ];
  const singleStable: AllocationSegment[] = [
    { bucket: "stable_reserve", pct: 100 },
  ];

  it("mining uses --ct-text-primary token", () => {
    const html = render({ segments: singleMining, ariaLabel: "mining" });
    expect(html).toContain("--ct-text-primary");
  });

  it("btc_tactical uses --ct-accent-strong token", () => {
    const html = render({ segments: singleBtc, ariaLabel: "btc" });
    expect(html).toContain("--ct-accent-strong");
  });

  it("usdc_base uses --ct-status-info token", () => {
    const html = render({ segments: singleUsdc, ariaLabel: "usdc" });
    expect(html).toContain("--ct-status-info");
  });

  it("stable_reserve uses --ct-status-warning token", () => {
    const html = render({ segments: singleStable, ariaLabel: "stable" });
    expect(html).toContain("--ct-status-warning");
  });
});

// ── 5. Backward compat: legacy DonutSegment[] still works ─────────────────────

describe("AllocationDonut — legacy DonutSegment[] backward compat", () => {
  it("renders flat donut from pre-computed dashArray/dashOffset", () => {
    // Simulating the legacy call signature
    const legacyProps = {
      segments: [
        {
          bucket: "mining",
          pct: 62,
          dashArray: "62 38",
          dashOffset: 0,
        },
        {
          bucket: "btc_tactical",
          pct: 18,
          dashArray: "18 82",
          dashOffset: -62,
        },
      ],
      ariaLabel: "Legacy flat donut",
    } as AllocationDonutProps;

    const html = render(legacyProps);
    expect(html).toContain("<svg");
    // No outer ring
    expect(html).not.toContain("alloc-outer-slice");
  });
});
