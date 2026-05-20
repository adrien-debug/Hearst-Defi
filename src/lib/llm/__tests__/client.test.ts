import { describe, expect, it, vi } from "vitest";

import Anthropic from "@anthropic-ai/sdk";

import { prisma } from "@/lib/db";
import { callLlm } from "@/lib/llm/client";

function apiError(status: number, message: string) {
  return new Anthropic.APIError(status, undefined, message, undefined);
}

describe("callLlm", () => {
  it("returns the LLM response on success", async () => {
    const mockResponse = {
      content: [{ type: "text" as const, text: '{"result":"ok"}' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    };

    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue(mockResponse),
      },
    };

    const result = await callLlm(
      "test-agent",
      {
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user" as const, content: "hello" }],
      },
      { client: mockClient },
    );

    expect(result.response).toBe(mockResponse);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and eventually succeeds", async () => {
    const mockResponse = {
      content: [{ type: "text" as const, text: '{"result":"ok"}' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    };

    const error429 = apiError(429, "Rate limited");

    const mockClient = {
      messages: {
        create: vi
          .fn()
          .mockRejectedValueOnce(error429)
          .mockResolvedValueOnce(mockResponse),
      },
    };

    const result = await callLlm(
      "test-agent",
      {
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user" as const, content: "hello" }],
      },
      { client: mockClient, maxRetries: 2 },
    );

    expect(result.response).toBe(mockResponse);
    expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries on 500", async () => {
    const error500 = apiError(500, "Server error");

    const mockClient = {
      messages: {
        create: vi.fn().mockRejectedValue(error500),
      },
    };

    await expect(
      callLlm(
        "test-agent",
        {
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user" as const, content: "hello" }],
        },
        { client: mockClient, maxRetries: 2 },
      ),
    ).rejects.toThrow("Server error");

    expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 400", async () => {
    const error400 = apiError(400, "Bad request");

    const mockClient = {
      messages: {
        create: vi.fn().mockRejectedValue(error400),
      },
    };

    await expect(
      callLlm(
        "test-agent",
        {
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user" as const, content: "hello" }],
        },
        { client: mockClient, maxRetries: 3 },
      ),
    ).rejects.toThrow("Bad request");

    expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
  });

  describe("prompt-cache observability", () => {
    // ----- pricing constants mirrored from client.ts (Anthropic docs) -----
    const SONNET_INPUT_PER_M = 3;
    const SONNET_OUTPUT_PER_M = 15;
    const CACHE_WRITE_MULT = 1.25;
    const CACHE_READ_MULT = 0.1;

    it("persists null cache fields and bills regular pricing when no cache usage", async () => {
      const mockResponse = {
        content: [{ type: "text" as const, text: "{}" }],
        usage: { input_tokens: 1000, output_tokens: 200 },
      };
      const mockClient = {
        messages: { create: vi.fn().mockResolvedValue(mockResponse) },
      };

      const { runId } = await callLlm(
        "test-no-cache",
        {
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: "system prompt A",
          messages: [{ role: "user" as const, content: "hello" }],
        },
        { client: mockClient },
      );

      const row = await prisma.llmRun.findUniqueOrThrow({ where: { id: runId } });
      expect(row.cacheCreationInputTokens).toBeNull();
      expect(row.cacheReadInputTokens).toBeNull();
      expect(row.systemPromptHash).toMatch(/^[a-f0-9]{64}$/);
      const expectedCost =
        (1000 * SONNET_INPUT_PER_M + 200 * SONNET_OUTPUT_PER_M) / 1_000_000;
      expect(row.costUsd).toBeCloseTo(expectedCost, 10);
    });

    it("persists cache_creation tokens and applies the 1.25x write multiplier", async () => {
      const mockResponse = {
        content: [{ type: "text" as const, text: "{}" }],
        usage: {
          input_tokens: 200,
          output_tokens: 100,
          cache_creation_input_tokens: 5000,
          cache_read_input_tokens: 0,
        },
      };
      const mockClient = {
        messages: { create: vi.fn().mockResolvedValue(mockResponse) },
      };

      const { runId } = await callLlm(
        "test-cache-write",
        {
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: "system prompt write",
          messages: [{ role: "user" as const, content: "hello" }],
        },
        { client: mockClient },
      );

      const row = await prisma.llmRun.findUniqueOrThrow({ where: { id: runId } });
      expect(row.cacheCreationInputTokens).toBe(5000);
      expect(row.cacheReadInputTokens).toBe(0);
      expect(row.systemPromptHash).toMatch(/^[a-f0-9]{64}$/);

      const expectedCost =
        (200 * SONNET_INPUT_PER_M +
          5000 * SONNET_INPUT_PER_M * CACHE_WRITE_MULT +
          0 +
          100 * SONNET_OUTPUT_PER_M) /
        1_000_000;
      expect(row.costUsd).toBeCloseTo(expectedCost, 10);
    });

    it("persists cache_read tokens and applies the 0.1x read multiplier", async () => {
      const mockResponse = {
        content: [{ type: "text" as const, text: "{}" }],
        usage: {
          input_tokens: 200,
          output_tokens: 100,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 5000,
        },
      };
      const mockClient = {
        messages: { create: vi.fn().mockResolvedValue(mockResponse) },
      };

      const { runId } = await callLlm(
        "test-cache-read",
        {
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: "system prompt read",
          messages: [{ role: "user" as const, content: "hello" }],
        },
        { client: mockClient },
      );

      const row = await prisma.llmRun.findUniqueOrThrow({ where: { id: runId } });
      expect(row.cacheCreationInputTokens).toBe(0);
      expect(row.cacheReadInputTokens).toBe(5000);
      expect(row.systemPromptHash).toMatch(/^[a-f0-9]{64}$/);

      const expectedCost =
        (200 * SONNET_INPUT_PER_M +
          0 +
          5000 * SONNET_INPUT_PER_M * CACHE_READ_MULT +
          100 * SONNET_OUTPUT_PER_M) /
        1_000_000;
      expect(row.costUsd).toBeCloseTo(expectedCost, 10);

      // Read path must be cheaper than an equivalent non-cached run — this
      // is the headline ~60–80% reduction we want to monitor in prod.
      const baselineCost =
        ((200 + 5000) * SONNET_INPUT_PER_M + 100 * SONNET_OUTPUT_PER_M) /
        1_000_000;
      expect(row.costUsd).toBeLessThan(baselineCost);
    });
  });

  it("throws when api key is missing and no client is injected", async () => {
    // Temporarily remove the API key from the cached env module
    const envModule = await import("@/lib/env");
    const savedKey = envModule.env.ANTHROPIC_API_KEY;
    Object.defineProperty(envModule.env, "ANTHROPIC_API_KEY", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    try {
      await expect(
        callLlm("test-agent", {
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user" as const, content: "hello" }],
        }),
      ).rejects.toThrow(/ANTHROPIC_API_KEY is not configured/);
    } finally {
      Object.defineProperty(envModule.env, "ANTHROPIC_API_KEY", {
        value: savedKey,
        writable: true,
        configurable: true,
      });
    }
  });
});
