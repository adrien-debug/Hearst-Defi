import { describe, expect, it } from "vitest";
import {
  estimateTokens,
  capTranscriptByTokens,
  MAX_TRANSCRIPT_TOKENS,
  TOKENS_PER_CHAR_FR,
} from "@/lib/llm/tokens";

describe("estimateTokens", () => {
  it("returns a positive integer for non-empty input", () => {
    const result = estimateTokens("Bonjour, comment allez-vous ?");
    expect(result).toBeGreaterThan(0);
    expect(Number.isInteger(result)).toBe(true);
  });

  it("returns 0 for an empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

describe("capTranscriptByTokens", () => {
  const short = [
    { role: "user", content: "Hi" },
    { role: "assistant", content: "Hello" },
  ];

  it("returns messages unchanged when they fit within budget (droppedCount=0)", () => {
    const { capped, droppedCount } = capTranscriptByTokens(short, MAX_TRANSCRIPT_TOKENS);
    expect(droppedCount).toBe(0);
    expect(capped).toHaveLength(short.length);
    expect(capped).toStrictEqual(short);
  });

  it("truncates and keeps the most recent messages when over budget", () => {
    // Build 10 messages each ~1000 chars → ~270 tokens estimated each
    // Budget = 500 tokens → should keep only the last ~1-2 messages
    const bigMessages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "a".repeat(1000),
    }));

    const { capped, droppedCount } = capTranscriptByTokens(bigMessages, 500);
    expect(droppedCount).toBeGreaterThan(0);
    expect(capped.length).toBeLessThan(bigMessages.length);
    // Capped messages must be the tail (most recent) of the original array.
    expect(capped).toStrictEqual(bigMessages.slice(bigMessages.length - capped.length));
  });

  it("after cap, estimated token sum of capped messages does not exceed maxTokens", () => {
    const bigMessages = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "b".repeat(800),
    }));

    const maxTokens = 1_000;
    const { capped } = capTranscriptByTokens(bigMessages, maxTokens);

    const totalTokens = capped.reduce(
      (acc, m) => acc + estimateTokens(m.content),
      0,
    );
    expect(totalTokens).toBeLessThanOrEqual(maxTokens);
  });

  it("1 message ultra-long → garde le dernier message tronqué à la fin", () => {
    const maxTokens = 1_000;
    // Content is 2× the token budget in chars
    const ultraLongContent = "x".repeat(Math.ceil(maxTokens / TOKENS_PER_CHAR_FR) * 2);
    const messages = [{ role: "user", content: ultraLongContent }];

    const { capped, droppedCount } = capTranscriptByTokens(messages, maxTokens);

    expect(capped).toHaveLength(1);
    expect(capped[0]!.content.startsWith("[…] ")).toBe(true);
    expect(estimateTokens(capped[0]!.content)).toBeLessThanOrEqual(maxTokens);
    expect(droppedCount).toBe(0);
  });

  it("5 messages dont le dernier ultra-long → garde le dernier tronqué, droppedCount=4", () => {
    const maxTokens = 1_000;
    const shortMessages = Array.from({ length: 4 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "court",
    }));
    const ultraLongContent = "y".repeat(Math.ceil(maxTokens / TOKENS_PER_CHAR_FR) * 2);
    const messages = [
      ...shortMessages,
      { role: "user", content: ultraLongContent },
    ];

    const { capped, droppedCount } = capTranscriptByTokens(messages, maxTokens);

    expect(capped).toHaveLength(1);
    expect(capped[0]!.content.startsWith("[…] ")).toBe(true);
    expect(estimateTokens(capped[0]!.content)).toBeLessThanOrEqual(maxTokens);
    expect(droppedCount).toBe(4);
  });
});
