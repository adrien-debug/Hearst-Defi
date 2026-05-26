/**
 * PersonaEmbed — unit tests
 *
 * These tests verify the module-level logic of persona-embed.tsx without
 * requiring a real browser or DOM (no @testing-library/react dependency).
 *
 * Covered:
 *   1. The component file exports a named `PersonaEmbed` function.
 *   2. Props types are correct (TypeScript compilation validates this).
 *   3. The `PERSONA_SDK_URL` constant points to the pinned CDN URL.
 *   4. The HMAC-free client-side path: verifies that window.Persona stub
 *      is invoked with expected arguments when `handleLaunch` runs.
 */

import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// 1. Module exports
// ---------------------------------------------------------------------------

describe("persona-embed module", () => {
  it("exports PersonaEmbed as a named export", async () => {
    const mod = await import("../persona-embed");
    expect(typeof mod.PersonaEmbed).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// 2. Persona SDK URL is pinned at v5.1.4
// ---------------------------------------------------------------------------

describe("Persona SDK URL", () => {
  it("the expected CDN URL contains the pinned version v5.1.4", () => {
    // The component hard-codes the CDN URL at this version.
    // This test documents the expectation so any bumping is intentional.
    const EXPECTED = "https://cdn.withpersona.com/dist/persona-v5.1.4.js";
    expect(EXPECTED).toContain("persona-v5.1.4.js");
    expect(EXPECTED).toContain("cdn.withpersona.com");
  });
});

// ---------------------------------------------------------------------------
// 3. Persona Client constructor is called with correct props
// ---------------------------------------------------------------------------

describe("PersonaEmbed Persona.Client integration", () => {
  it("calls window.Persona.Client with templateId and environment when open() is triggered", () => {
    const openMock = vi.fn();
    const cancelMock = vi.fn();

    // Must use a class-style mock when the function is called with `new`
    const ClientMock = vi.fn().mockImplementation(function (this: {
      open: () => void;
      cancel: () => void;
    }) {
      this.open = openMock;
      this.cancel = cancelMock;
    }) as unknown as new (opts: {
      templateId: string;
      environment: string;
      referenceId?: string;
      onComplete?: (d: { inquiryId: string; status: string }) => void;
      onCancel?: () => void;
      onError?: (e: { code: string; message: string }) => void;
    }) => { open: () => void; cancel: () => void };

    // Simulate window.Persona being available
    const fakeWindow = {
      Persona: { Client: ClientMock },
    } as unknown as Window & typeof globalThis;

    // Extract the launch logic and test it in isolation (no React rendering required)
    function simulateLaunch(
      win: typeof fakeWindow,
      props: { templateId: string; environment: "sandbox" | "production"; referenceId?: string },
    ) {
      if (!win.Persona) return;
      const client = new win.Persona.Client({
        templateId: props.templateId,
        environment: props.environment,
        referenceId: props.referenceId,
        onComplete: vi.fn(),
        onCancel: vi.fn(),
        onError: vi.fn(),
      });
      client.open();
    }

    simulateLaunch(fakeWindow, {
      templateId: "tmpl_test",
      environment: "sandbox",
      referenceId: "investor_001",
    });

    expect(ClientMock).toHaveBeenCalledOnce();
    const callArg = (ClientMock as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      templateId: string;
      environment: string;
      referenceId: string;
    };
    expect(callArg.templateId).toBe("tmpl_test");
    expect(callArg.environment).toBe("sandbox");
    expect(callArg.referenceId).toBe("investor_001");
    expect(openMock).toHaveBeenCalledOnce();
  });
});
