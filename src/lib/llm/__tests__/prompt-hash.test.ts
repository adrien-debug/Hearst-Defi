import { describe, expect, it } from "vitest";
import {
  sha256Hex,
  REVIEW_FACILITATOR_HASH,
  REVIEW_DOCUMENT_HASH,
} from "@/lib/llm/prompt-hash";

describe("sha256Hex", () => {
  it("returns the same hash for the same input (deterministic)", () => {
    const input = "hello world";
    expect(sha256Hex(input)).toBe(sha256Hex(input));
  });

  it("returns a 64-character hex string", () => {
    const hash = sha256Hex("test input");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns different hashes for different inputs", () => {
    expect(sha256Hex("input-A")).not.toBe(sha256Hex("input-B"));
  });
});

describe("prompt hash constants", () => {
  it("REVIEW_FACILITATOR_HASH is a 64-char hex string", () => {
    expect(REVIEW_FACILITATOR_HASH).toHaveLength(64);
    expect(REVIEW_FACILITATOR_HASH).toMatch(/^[a-f0-9]{64}$/);
  });

  it("REVIEW_DOCUMENT_HASH is a 64-char hex string", () => {
    expect(REVIEW_DOCUMENT_HASH).toHaveLength(64);
    expect(REVIEW_DOCUMENT_HASH).toMatch(/^[a-f0-9]{64}$/);
  });
});
