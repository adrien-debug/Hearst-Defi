/**
 * Integration tests for GET /api/statements/[id]/pdf
 *
 * All external dependencies are mocked (auth, db, rate-limit, react-pdf,
 * logger) so the suite runs without a real DB, Redis or PDF renderer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mocks before any module imports ──────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/require-auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    investor: { findUnique: vi.fn() },
    position: { findMany: vi.fn() },
    investorTransaction: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  assertRateLimit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock @react-pdf/renderer — renderToBuffer is the only async call we need
// to control; everything else is structural and can be a no-op.
// NOTE: use a lazy factory for renderToBuffer so Buffer is resolved at call
// time (not at hoist time, where globalThis may not be fully initialised).
vi.mock("@react-pdf/renderer", () => {
  const mockPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
  return {
    renderToBuffer: vi.fn().mockResolvedValue(mockPdfBytes),
    Document: ({ children }: { children: unknown }) => children,
    Page: ({ children }: { children: unknown }) => children,
    Text: ({ children }: { children: unknown }) => children,
    View: ({ children }: { children: unknown }) => children,
    Svg: ({ children }: { children: unknown }) => children,
    Path: () => null,
    Rect: () => null,
    G: ({ children }: { children: unknown }) => children,
    StyleSheet: {
      create: (s: Record<string, unknown>) => s,
    },
  };
});

// ── Import modules AFTER mocks ─────────────────────────────────────────────

import { GET } from "@/app/api/statements/[id]/pdf/route";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import * as reactPdf from "@react-pdf/renderer";

// ── Typed helpers ──────────────────────────────────────────────────────────

const mockRequireAuth = vi.mocked(requireAuth);
const mockInvestorFindUnique = vi.mocked(prisma.investor.findUnique);
const mockPositionFindMany = vi.mocked(prisma.position.findMany);
const mockTxFindMany = vi.mocked(prisma.investorTransaction.findMany);
const mockAssertRateLimit = vi.mocked(assertRateLimit);

// Minimal investor stub that satisfies the ownership check.
const INVESTOR_STUB = {
  id: "investor_abc123",
  userId: "user_abc123",
  walletAddress: null,
  email: "lp@example.com",
  kycStatus: "approved",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  user: { email: "lp@example.com" },
};

// Minimal position stub.
const POSITION_STUB = {
  id: "pos_xyz",
  investorId: "investor_abc123",
  vaultDeploymentId: null,
  vaultDeployment: null,
  vaultKey: "hearst_yield_vault",
  principalUsdc: { toNumber: () => 250_000 },
  accruedYieldUsdc: { toNumber: () => 12_500 },
  distributedUsdc: { toNumber: () => 5_000 },
  status: "active",
  subscribedAt: new Date("2026-02-01"),
  maturedAt: null,
  exitedAt: null,
  txHashOpen: null,
};

// Helper: build a minimal Request for the route handler.
function makeRequest(investorId: string = "investor_abc123"): Request {
  return new Request(
    `http://localhost/api/statements/${investorId}/pdf`,
    { method: "GET" },
  );
}

// Helper: build route params (Next.js 15 async params pattern).
function makeParams(id: string = "investor_abc123") {
  return { params: Promise.resolve({ id }) };
}

// ── Tests ──────────────────────────────────────────────────────────────────

// Fixed PDF bytes used as the default mock return value.
const MOCK_PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

describe("GET /api/statements/[id]/pdf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Restore the default renderToBuffer implementation after each reset.
    vi.mocked(reactPdf.renderToBuffer).mockResolvedValue(MOCK_PDF_BYTES as never);
    mockAssertRateLimit.mockResolvedValue(undefined);
    mockPositionFindMany.mockResolvedValue([]);
    mockTxFindMany.mockResolvedValue([]);
  });

  // ── 200 — happy path ────────────────────────────────────────────────────

  it("returns 200 with Content-Type application/pdf for an authenticated owner", async () => {
    mockRequireAuth.mockResolvedValue({ userId: "user_abc123" });
    mockInvestorFindUnique.mockResolvedValue(INVESTOR_STUB as never);
    mockPositionFindMany.mockResolvedValue([POSITION_STUB as never]);
    mockTxFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toMatch(/attachment/);
    expect(res.headers.get("Content-Disposition")).toMatch(/hearst-statement-/);
  });

  it("returns a non-zero Content-Length when the PDF renders successfully", async () => {
    mockRequireAuth.mockResolvedValue({ userId: "user_abc123" });
    mockInvestorFindUnique.mockResolvedValue(INVESTOR_STUB as never);
    mockPositionFindMany.mockResolvedValue([POSITION_STUB as never]);
    mockTxFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest(), makeParams());

    const contentLength = res.headers.get("Content-Length");
    expect(Number(contentLength)).toBeGreaterThan(0);
  });

  // ── 401 — unauthenticated ───────────────────────────────────────────────

  it("returns 401 when requireAuth throws (no session)", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Authentication required. Please log in."));

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBeDefined();
  });

  it("returns 401 with a JSON error body on auth failure", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Authentication required. Please log in."));

    const res = await GET(makeRequest(), makeParams());

    const body = await res.json() as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  // ── 404 — wrong investor id ─────────────────────────────────────────────

  it("returns 404 when the investor does not exist", async () => {
    mockRequireAuth.mockResolvedValue({ userId: "user_abc123" });
    mockInvestorFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest("investor_does_not_exist"), makeParams("investor_does_not_exist"));

    expect(res.status).toBe(404);
  });

  it("returns 404 when the investor id belongs to a different user (ownership check)", async () => {
    mockRequireAuth.mockResolvedValue({ userId: "user_attacker" });
    // The investor row exists but is owned by a different user.
    mockInvestorFindUnique.mockResolvedValue(INVESTOR_STUB as never);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(404);
  });

  // ── 429 — rate limited ──────────────────────────────────────────────────

  it("returns 429 when the rate limit is exceeded", async () => {
    mockRequireAuth.mockResolvedValue({ userId: "user_abc123" });
    mockAssertRateLimit.mockRejectedValue(new Error("Rate limit exceeded. Try again in 60s."));

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(429);
  });

  // ── 500 — render failure ────────────────────────────────────────────────

  it("returns 500 when PDF rendering fails", async () => {
    vi.mocked(reactPdf.renderToBuffer).mockRejectedValueOnce(new Error("render crash"));

    mockRequireAuth.mockResolvedValue({ userId: "user_abc123" });
    mockInvestorFindUnique.mockResolvedValue(INVESTOR_STUB as never);
    mockPositionFindMany.mockResolvedValue([]);
    mockTxFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(500);
  });
});
