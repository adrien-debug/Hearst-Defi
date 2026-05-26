import { describe, it, expect, vi } from "vitest";
import { useForbiddenWords } from "../use-forbidden-words";

// ---------------------------------------------------------------------------
// Minimal shim so the hook can run outside React (no real useMemo needed here)
// ---------------------------------------------------------------------------
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    // In tests we run useMemo eagerly (no memoisation needed)
    useMemo: (fn: () => unknown) => fn(),
  };
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("useForbiddenWords", () => {
  it("detects a simple forbidden word", () => {
    const matches = useForbiddenWords("We guarantee returns of 15%.");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const hit = matches.find((m) => m.word === "guarantee");
    expect(hit).toBeDefined();
  });

  it('allows the phrase "not guaranteed" (exception rule)', () => {
    const matches = useForbiddenWords(
      "Returns are not guaranteed and past performance is not indicative.",
    );
    // Should produce zero matches because "guarantee" appears only in negated form
    expect(matches.filter((m) => m.word === "guarantee")).toHaveLength(0);
  });

  it("is case-insensitive — GUARANTEE", () => {
    const matches = useForbiddenWords("We GUARANTEE returns.");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("is case-insensitive — Guarantee (mixed case)", () => {
    const matches = useForbiddenWords("We Guarantee returns.");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("is case-insensitive — RISK-FREE", () => {
    const matches = useForbiddenWords("This is RISK-FREE investing.");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("detects inflected form: guaranteed", () => {
    const matches = useForbiddenWords("We guaranteed you a profit.");
    expect(matches.find((m) => m.word === "guarantee")).toBeDefined();
  });

  it("detects inflected form: promises", () => {
    const matches = useForbiddenWords("She promises high yield.");
    expect(matches.find((m) => m.word === "promise")).toBeDefined();
  });

  it("detects inflected form: certainty", () => {
    const matches = useForbiddenWords("Certainty of returns is high.");
    expect(matches.find((m) => m.word === "certain")).toBeDefined();
  });

  it("detects inflected form: risk-free", () => {
    const matches = useForbiddenWords("This is a risk-free product.");
    expect(matches.find((m) => m.word === "risk-free")).toBeDefined();
  });

  it("returns empty array for clean APY range text", () => {
    const matches = useForbiddenWords("This vault targets an 8–15% APY range.");
    expect(matches).toHaveLength(0);
  });

  it("returns empty array for negated disclaimer text", () => {
    const matches = useForbiddenWords(
      "Distributions are subject to operational performance. Results are not guaranteed.",
    );
    expect(matches).toHaveLength(0);
  });

  it("returns match index pointing to the correct position", () => {
    const text = "We promise returns.";
    const matches = useForbiddenWords(text);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const hit = matches[0]!;
    expect(text.slice(hit.index, hit.index + hit.length).toLowerCase()).toMatch(
      /^promise/,
    );
  });
});
