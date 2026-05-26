/**
 * POST /api/persona/webhook — unit tests
 *
 * Tests HMAC verification, payload parsing, and KycEvent persistence
 * without hitting a real database (prisma is mocked).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHmac } from "node:crypto";

// ---------------------------------------------------------------------------
// Mock prisma — must be set up before the route module is imported
// ---------------------------------------------------------------------------

const mockCreate = vi.fn().mockResolvedValue({});
const mockFindFirst = vi.fn().mockResolvedValue(null);
const mockUpdateMany = vi.fn().mockResolvedValue({ count: 1 });

vi.mock("@/lib/db", () => ({
  prisma: {
    kycEvent: {
      create: mockCreate,
      findFirst: mockFindFirst,
    },
    investor: {
      updateMany: mockUpdateMany,
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSignature(secret: string, timestamp: string, body: string): string {
  const signedPayload = `${timestamp}.${body}`;
  const v1 = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}


const VALID_PAYLOAD = JSON.stringify({
  data: {
    id: "inq_test123",
    type: "inquiry",
    attributes: {
      status: "completed",
      "reference-id": "user_abc",
    },
  },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/persona/webhook", () => {
  const SECRET = "test-webhook-secret";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PERSONA_WEBHOOK_SECRET = SECRET;
  });

  it("returns 401 when Persona-Signature header is missing", async () => {
    const { POST } = await import("../webhook/route");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest("http://localhost/api/persona/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: VALID_PAYLOAD,
    });
    const res = await POST(nextReq);
    expect(res.status).toBe(401);
  });

  it("returns 401 when signature is invalid", async () => {
    const { POST } = await import("../webhook/route");
    const { NextRequest } = await import("next/server");
    const req = new NextRequest("http://localhost/api/persona/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "persona-signature": "t=1234567890,v1=badhex",
      },
      body: VALID_PAYLOAD,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 and persists KycEvent when signature is valid", async () => {
    const { POST } = await import("../webhook/route");
    const { NextRequest } = await import("next/server");

    const ts = String(Math.floor(Date.now() / 1000));
    const sig = buildSignature(SECRET, ts, VALID_PAYLOAD);

    const req = new NextRequest("http://localhost/api/persona/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "persona-signature": sig,
      },
      body: VALID_PAYLOAD,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { received: boolean };
    expect(json.received).toBe(true);

    // KycEvent should have been created
    expect(mockCreate).toHaveBeenCalledOnce();
    const createCall = mockCreate.mock.calls[0]?.[0] as {
      data: { inquiryId: string; status: string; userId: string };
    };
    expect(createCall.data.inquiryId).toBe("inq_test123");
    expect(createCall.data.status).toBe("completed");
    expect(createCall.data.userId).toBe("user_abc");
  });

  it("returns 400 when payload shape is invalid", async () => {
    const { POST } = await import("../webhook/route");
    const { NextRequest } = await import("next/server");

    const badBody = JSON.stringify({ malformed: true });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = buildSignature(SECRET, ts, badBody);

    const req = new NextRequest("http://localhost/api/persona/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "persona-signature": sig,
      },
      body: badBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 when PERSONA_WEBHOOK_SECRET is not set", async () => {
    delete process.env.PERSONA_WEBHOOK_SECRET;
    const { POST } = await import("../webhook/route");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest("http://localhost/api/persona/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: VALID_PAYLOAD,
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
