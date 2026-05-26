import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing modules that touch it
vi.mock("@/lib/db", () => ({
  prisma: {
    savedView: {
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import {
  createView,
  updateView,
  deleteView,
  loadUserViews,
  seedDefaults,
  type SavedViewRow,
} from "../actions";
import { DEFAULT_VIEWS, DEFAULT_VIEW_COUNT } from "../templates";

const USER_A = "user_aaa";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<SavedViewRow> = {}): SavedViewRow {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    id: "clxabc123",
    userId: USER_A,
    name: "My view",
    scope: "vaults",
    filters: {},
    sort: null,
    columns: null,
    visibility: "private",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeDbRow(row: SavedViewRow) {
  return {
    ...row,
    filters: JSON.stringify(row.filters),
    sort: row.sort ? JSON.stringify(row.sort) : null,
    columns: row.columns ? JSON.stringify(row.columns) : null,
  };
}

// ---------------------------------------------------------------------------
// Templates shape tests (pure, no DB)
// ---------------------------------------------------------------------------

describe("DEFAULT_VIEWS", () => {
  it("exports exactly 8 templates", () => {
    expect(DEFAULT_VIEWS).toHaveLength(8);
    expect(DEFAULT_VIEW_COUNT).toBe(8);
  });

  it("every template has a non-empty name and valid scope", () => {
    const validScopes = new Set([
      "vaults",
      "distributions",
      "proofs",
      "investors",
      "signers",
      "memos",
      "events",
    ]);
    for (const tpl of DEFAULT_VIEWS) {
      expect(tpl.name.length).toBeGreaterThan(0);
      expect(validScopes.has(tpl.scope)).toBe(true);
    }
  });

  it("every template has a non-empty filters object", () => {
    for (const tpl of DEFAULT_VIEWS) {
      expect(typeof tpl.filters).toBe("object");
      expect(Object.keys(tpl.filters).length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// seedDefaults — idempotence tests
// ---------------------------------------------------------------------------

describe("seedDefaults", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates 8 views when user has none", async () => {
    vi.mocked(prisma.savedView.count).mockResolvedValue(0);
    vi.mocked(prisma.savedView.createMany).mockResolvedValue({ count: 8 });

    await seedDefaults(USER_A);

    expect(prisma.savedView.createMany).toHaveBeenCalledOnce();
    const call = vi.mocked(prisma.savedView.createMany).mock.calls[0]![0]!;
    expect(call.data).toHaveLength(8);
    // All rows belong to the user
    for (const row of call.data as Array<{ userId: string }>) {
      expect(row.userId).toBe(USER_A);
    }
  });

  it("is idempotent — does nothing when user already has views", async () => {
    vi.mocked(prisma.savedView.count).mockResolvedValue(8);

    await seedDefaults(USER_A);

    expect(prisma.savedView.createMany).not.toHaveBeenCalled();
  });

  it("still no-ops when user has partial views (e.g. 3)", async () => {
    vi.mocked(prisma.savedView.count).mockResolvedValue(3);

    await seedDefaults(USER_A);

    expect(prisma.savedView.createMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createView
// ---------------------------------------------------------------------------

describe("createView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists the row and returns a hydrated SavedViewRow", async () => {
    const filters = { health: { ne: "healthy" } };
    const raw = makeDbRow(makeRow({ filters, scope: "vaults", name: "Bad vaults" }));
    vi.mocked(prisma.savedView.create).mockResolvedValue(raw);

    const result = await createView(USER_A, "vaults", "Bad vaults", filters);

    expect(prisma.savedView.create).toHaveBeenCalledOnce();
    expect(result.name).toBe("Bad vaults");
    expect(result.scope).toBe("vaults");
    expect(result.filters).toEqual(filters);
    expect(result.visibility).toBe("private");
  });

  it("serializes sort and columns to JSON when provided", async () => {
    const filters = { status: "live" };
    const sort = { field: "aumUsdc", direction: "desc" as const };
    const columns = ["name", "aumUsdc", "apy"];
    const raw = makeDbRow(makeRow({ filters, sort, columns }));
    vi.mocked(prisma.savedView.create).mockResolvedValue(raw);

    const result = await createView(USER_A, "vaults", "My view", filters, sort, columns);

    const createCall = vi.mocked(prisma.savedView.create).mock.calls[0]![0]!;
    expect(JSON.parse(createCall.data.sort as string)).toEqual(sort);
    expect(JSON.parse(createCall.data.columns as string)).toEqual(columns);
    expect(result.sort).toEqual(sort);
    expect(result.columns).toEqual(columns);
  });
});

// ---------------------------------------------------------------------------
// updateView
// ---------------------------------------------------------------------------

describe("updateView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("merges only supplied fields", async () => {
    const original = makeRow({ name: "Original", visibility: "private" });
    const updated = makeDbRow({ ...original, name: "Renamed" });
    vi.mocked(prisma.savedView.update).mockResolvedValue(updated);

    const result = await updateView(original.id, { name: "Renamed" });

    const call = vi.mocked(prisma.savedView.update).mock.calls[0]![0]!;
    expect(call.data.name).toBe("Renamed");
    // visibility was NOT supplied — should not be in data
    expect(call.data.visibility).toBeUndefined();
    expect(result.name).toBe("Renamed");
  });

  it("allows clearing sort to null", async () => {
    const original = makeRow({ sort: { field: "aumUsdc", direction: "desc" } });
    const updated = makeDbRow({ ...original, sort: null });
    vi.mocked(prisma.savedView.update).mockResolvedValue(updated);

    await updateView(original.id, { sort: null });

    const call = vi.mocked(prisma.savedView.update).mock.calls[0]![0]!;
    expect(call.data.sort).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteView
// ---------------------------------------------------------------------------

describe("deleteView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls prisma.savedView.delete with the correct id", async () => {
    vi.mocked(prisma.savedView.delete).mockResolvedValue(makeDbRow(makeRow()));

    await deleteView("clxabc123");

    expect(prisma.savedView.delete).toHaveBeenCalledWith({
      where: { id: "clxabc123" },
    });
  });
});

// ---------------------------------------------------------------------------
// loadUserViews
// ---------------------------------------------------------------------------

describe("loadUserViews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all views for user when no scope filter", async () => {
    const rows = [
      makeDbRow(makeRow({ scope: "vaults" })),
      makeDbRow(makeRow({ id: "clxabc456", scope: "investors" })),
    ];
    vi.mocked(prisma.savedView.findMany).mockResolvedValue(rows);

    const result = await loadUserViews(USER_A);

    expect(result).toHaveLength(2);
    const call = vi.mocked(prisma.savedView.findMany).mock.calls[0]![0]!;
    expect(call.where).toEqual({ userId: USER_A });
  });

  it("filters by scope when provided", async () => {
    const rows = [makeDbRow(makeRow({ scope: "vaults" }))];
    vi.mocked(prisma.savedView.findMany).mockResolvedValue(rows);

    const result = await loadUserViews(USER_A, "vaults");

    expect(result).toHaveLength(1);
    expect(result[0]!.scope).toBe("vaults");
    const call = vi.mocked(prisma.savedView.findMany).mock.calls[0]![0]!;
    expect(call.where).toEqual({ userId: USER_A, scope: "vaults" });
  });

  it("hydrates JSON fields back to objects", async () => {
    const filters = { status: "live", oracle_stale: true };
    const sort = { field: "aumUsdc", direction: "asc" as const };
    const columns = ["name", "apy"];
    const row = makeDbRow(makeRow({ filters, sort, columns }));
    vi.mocked(prisma.savedView.findMany).mockResolvedValue([row]);

    const [result] = await loadUserViews(USER_A);

    expect(result!.filters).toEqual(filters);
    expect(result!.sort).toEqual(sort);
    expect(result!.columns).toEqual(columns);
  });
});
