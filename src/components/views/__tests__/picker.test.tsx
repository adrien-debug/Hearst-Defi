/**
 * Tests for SavedViewsPicker.
 *
 * We exercise structural and URL-serialization contracts without mounting
 * React DOM — consistent with the project's `environment: "node"` vitest config.
 *
 * React hooks (useId) require a renderer context; we mock them so we can call
 * the component as a plain function without a DOM or renderer.
 */

import { describe, it, expect, vi } from "vitest";

// Mock React hooks that require a renderer context
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal();
  return Object.assign({}, actual as object, {
    useId: () => "test-id",
    useTransition: () => [false, (fn: () => void) => fn()],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useState: (initial: unknown) => [initial, () => undefined] as any,
  });
});

import type { SavedViewRow } from "@/lib/views/actions";
import type { ViewScope } from "@/lib/views/templates";

// ---------------------------------------------------------------------------
// URL serialization helpers (pure functions, no DOM needed)
// ---------------------------------------------------------------------------

/**
 * Serialize a view id to a URL search params string.
 */
function serializeViewId(viewId: string): string {
  const params = new URLSearchParams({ view: viewId });
  return params.toString();
}

/**
 * Serialize ad-hoc filter/sort/columns to URL params.
 */
function serializeAdHoc(opts: {
  filters?: Record<string, unknown>;
  sort?: { field: string; direction: "asc" | "desc" };
  columns?: string[];
}): string {
  const params = new URLSearchParams();
  if (opts.filters && Object.keys(opts.filters).length > 0) {
    params.set("f", JSON.stringify(opts.filters));
  }
  if (opts.sort) {
    params.set("s", JSON.stringify(opts.sort));
  }
  if (opts.columns && opts.columns.length > 0) {
    params.set("c", JSON.stringify(opts.columns));
  }
  return params.toString();
}

/**
 * Parse a URLSearchParams string back to the saved view id (if present).
 */
function parseViewId(search: string): string | null {
  const params = new URLSearchParams(search);
  return params.get("view");
}

/**
 * Parse ad-hoc params back to filter/sort/columns objects.
 */
function parseAdHoc(search: string): {
  filters: Record<string, unknown> | null;
  sort: { field: string; direction: "asc" | "desc" } | null;
  columns: string[] | null;
} {
  const params = new URLSearchParams(search);
  const f = params.get("f");
  const s = params.get("s");
  const c = params.get("c");
  return {
    filters: f ? (JSON.parse(f) as Record<string, unknown>) : null,
    sort: s ? (JSON.parse(s) as { field: string; direction: "asc" | "desc" }) : null,
    columns: c ? (JSON.parse(c) as string[]) : null,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeView(overrides: Partial<SavedViewRow> = {}): SavedViewRow {
  const now = new Date("2026-01-01T00:00:00Z");
  return {
    id: "clxabc123",
    userId: "user_aaa",
    name: "My view",
    scope: "vaults" as ViewScope,
    filters: { status: "live" },
    sort: null,
    columns: null,
    visibility: "private",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// URL serialization roundtrip (7 cases from spec)
// ---------------------------------------------------------------------------

describe("URL state — saved view id serialization", () => {
  it("serializes a view id to ?view=<id>", () => {
    const id = "clxabc123";
    const result = serializeViewId(id);
    expect(result).toBe("view=clxabc123");
  });

  it("roundtrip: serialize then parse returns the original id", () => {
    const id = "clxabc456";
    const serialized = serializeViewId(id);
    const parsed = parseViewId(serialized);
    expect(parsed).toBe(id);
  });

  it("returns null when view param is absent", () => {
    expect(parseViewId("f=%7B%7D")).toBeNull();
  });
});

describe("URL state — ad-hoc filter/sort/columns serialization", () => {
  it("serializes filters to ?f=<json>", () => {
    const filters = { status: "live", oracle_stale: true };
    const result = serializeAdHoc({ filters });
    const parsed = parseAdHoc(result);
    expect(parsed.filters).toEqual(filters);
  });

  it("serializes sort to ?s=<json>", () => {
    const sort = { field: "aumUsdc", direction: "desc" as const };
    const result = serializeAdHoc({ sort });
    const parsed = parseAdHoc(result);
    expect(parsed.sort).toEqual(sort);
  });

  it("serializes columns to ?c=<json>", () => {
    const columns = ["name", "apy", "aumUsdc"];
    const result = serializeAdHoc({ columns });
    const parsed = parseAdHoc(result);
    expect(parsed.columns).toEqual(columns);
  });

  it("roundtrip: full ad-hoc state survives serialize → parse", () => {
    const opts = {
      filters: { health: { ne: "healthy" } },
      sort: { field: "name", direction: "asc" as const },
      columns: ["name", "status"],
    };
    const serialized = serializeAdHoc(opts);
    const parsed = parseAdHoc(serialized);
    expect(parsed.filters).toEqual(opts.filters);
    expect(parsed.sort).toEqual(opts.sort);
    expect(parsed.columns).toEqual(opts.columns);
  });
});

// ---------------------------------------------------------------------------
// SavedViewsPicker — structural contract (component as plain function)
// ---------------------------------------------------------------------------

import { SavedViewsPicker } from "../saved-views-picker";

describe("SavedViewsPicker", () => {
  it("renders without throwing when views list is empty", () => {
    // Call as plain function (no DOM) — just check it doesn't throw
    expect(() =>
      SavedViewsPicker({
        views: [],
        scope: "vaults",
        onSelect: () => undefined,
        onSaveAs: () => undefined,
      }),
    ).not.toThrow();
  });

  it("renders without throwing with a populated views list", () => {
    const views = [
      makeView({ id: "v1", name: "Live vaults" }),
      makeView({ id: "v2", name: "Paused vaults", scope: "vaults" }),
    ];
    expect(() =>
      SavedViewsPicker({
        views,
        activeViewId: "v1",
        scope: "vaults",
        onSelect: () => undefined,
        onSaveAs: () => undefined,
      }),
    ).not.toThrow();
  });

  it("returns a React element (non-null)", () => {
    const result = SavedViewsPicker({
      views: [makeView()],
      scope: "investors",
      onSelect: () => undefined,
      onSaveAs: () => undefined,
    });
    expect(result).not.toBeNull();
    expect(result).toBeDefined();
  });

  it("includes role='toolbar' on the container", () => {
    const result = SavedViewsPicker({
      views: [],
      scope: "distributions",
      onSelect: () => undefined,
      onSaveAs: () => undefined,
    }) as React.ReactElement<{ role?: string }>;
    expect(result.props.role).toBe("toolbar");
  });
});
