import "server-only";

import type { InvestorMemoInput } from "@/lib/agents/investor-memo";
import type { InvestorMemoOutput } from "@/lib/agents/schemas";

/**
 * Combined payload passed to the PDF template. The PDF needs both:
 *  - The structured engine input (`InvestorMemoInput`) — numbers, allocations,
 *    backtests, BTC tactical state. The PDF is driven from these so its
 *    tables/charts stay faithful to the engine, not a paraphrased model output.
 *  - The Opus-generated Markdown sections — used only where prose is needed
 *    (executive summary, disclaimer). The PDF intentionally does NOT render
 *    raw Markdown; it extracts the disclaimer verbatim and uses a short
 *    summary block for the executive bullets.
 *
 * If `memo` is omitted the PDF still renders with the engine data and falls
 * back to canned copy for the prose-heavy sections (used in dev / preview).
 */
export interface MemoPdfData {
  input: InvestorMemoInput;
  memo: InvestorMemoOutput | null;
  generatedAt: string;
  period: string;
}

/** Stable label for an APY range field. */
export function formatApyRange(range: { low: number; high: number }): string {
  return `${range.low.toFixed(1)}-${range.high.toFixed(1)}%`;
}

export function formatUsd(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function formatPct(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/**
 * Period label like "January 2026" derived from an ISO date.
 */
export function periodFromIso(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Short YYYY-MM filename slug.
 */
export function filenameSlugFromIso(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Extracts the first 3-4 bullets from the executive summary Markdown so the
 * cover/page 2 can show structured highlights. If we can't find bullets,
 * falls back to splitting on sentences.
 */
export function extractBullets(md: string, max = 4): string[] {
  const lines = md.split("\n").map((l) => l.trim());
  const bullets = lines
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, "").trim())
    .filter((l) => l.length > 0);
  if (bullets.length > 0) {
    return bullets.slice(0, max);
  }
  // Fallback: take the first paragraph and split into sentences.
  const firstPara = md.split(/\n\s*\n/).find((p) => p.trim().length > 0) ?? "";
  const sentences = firstPara
    .replace(/\n+/g, " ")
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return sentences.slice(0, max);
}

/**
 * Strips Markdown emphasis / headings from a string so it renders as
 * plain text inside react-pdf `<Text>`.
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\([^)]+\)/g, "$1")
    .replace(/\s+\n/g, "\n")
    .trim();
}
