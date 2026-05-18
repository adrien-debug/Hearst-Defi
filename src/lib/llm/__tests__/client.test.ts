import { describe, expect, it, vi } from "vitest";

import Anthropic from "@anthropic-ai/sdk";

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
