"use server";

import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { DEFAULT_VIEWS } from "./templates";
import type { ViewScope, ViewVisibility, ViewFilters, ViewSort } from "./templates";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const ScopeEnum = z.enum([
  "vaults",
  "distributions",
  "proofs",
  "investors",
  "signers",
  "memos",
  "events",
] as [ViewScope, ...ViewScope[]]);

const VisibilityEnum = z.enum(["private", "team"] as [ViewVisibility, ...ViewVisibility[]]);

const CreateViewSchema = z.object({
  userId: z.string().min(1).max(255),
  scope: ScopeEnum,
  name: z.string().min(1).max(120),
  filters: z.record(z.string(), z.unknown()),
  sort: z
    .object({ field: z.string(), direction: z.enum(["asc", "desc"] as ["asc", "desc"]) })
    .optional(),
  columns: z.array(z.string()).optional(),
  visibility: VisibilityEnum.default("private"),
});

const UpdateViewSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  sort: z
    .object({ field: z.string(), direction: z.enum(["asc", "desc"] as ["asc", "desc"]) })
    .optional()
    .nullable(),
  columns: z.array(z.string()).optional().nullable(),
  visibility: VisibilityEnum.optional(),
});

// ---------------------------------------------------------------------------
// Types (exported so UI can import them without depending on Prisma directly)
// ---------------------------------------------------------------------------

export interface SavedViewRow {
  id: string;
  userId: string;
  name: string;
  scope: ViewScope;
  filters: ViewFilters;
  sort: ViewSort | null;
  columns: string[] | null;
  visibility: ViewVisibility;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function hydrateRow(row: {
  id: string;
  userId: string;
  name: string;
  scope: string;
  filters: string;
  sort: string | null;
  columns: string | null;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
}): SavedViewRow {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    scope: row.scope as ViewScope,
    filters: (parseJson<ViewFilters>(row.filters) ?? {}) as ViewFilters,
    sort: parseJson<ViewSort>(row.sort),
    columns: parseJson<string[]>(row.columns),
    visibility: row.visibility as ViewVisibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// CRUD actions
// ---------------------------------------------------------------------------

/**
 * Create a new saved view for a user.
 */
export async function createView(
  userId: string,
  scope: ViewScope,
  name: string,
  filters: ViewFilters,
  sort?: ViewSort,
  columns?: string[],
  visibility: ViewVisibility = "private",
): Promise<SavedViewRow> {
  const parsed = CreateViewSchema.parse({
    userId,
    scope,
    name,
    filters,
    sort,
    columns,
    visibility,
  });

  const row = await prisma.savedView.create({
    data: {
      userId: parsed.userId,
      name: parsed.name,
      scope: parsed.scope,
      filters: JSON.stringify(parsed.filters),
      sort: parsed.sort ? JSON.stringify(parsed.sort) : null,
      columns: parsed.columns ? JSON.stringify(parsed.columns) : null,
      visibility: parsed.visibility,
    },
  });

  return hydrateRow(row);
}

/**
 * Update an existing saved view (partial — only supplied fields are changed).
 */
export async function updateView(
  id: string,
  partial: {
    name?: string;
    filters?: ViewFilters;
    sort?: ViewSort | null;
    columns?: string[] | null;
    visibility?: ViewVisibility;
  },
): Promise<SavedViewRow> {
  const parsed = UpdateViewSchema.parse(partial);

  const data: Record<string, unknown> = {};
  if (parsed.name !== undefined) data.name = parsed.name;
  if (parsed.filters !== undefined) data.filters = JSON.stringify(parsed.filters);
  if ("sort" in parsed) {
    data.sort = parsed.sort ? JSON.stringify(parsed.sort) : null;
  }
  if ("columns" in parsed) {
    data.columns = parsed.columns ? JSON.stringify(parsed.columns) : null;
  }
  if (parsed.visibility !== undefined) data.visibility = parsed.visibility;

  const row = await prisma.savedView.update({
    where: { id },
    data,
  });

  return hydrateRow(row);
}

/**
 * Delete a saved view by id.
 */
export async function deleteView(id: string): Promise<void> {
  await prisma.savedView.delete({ where: { id } });
}

/**
 * Load all saved views for a user, optionally filtered by scope.
 */
export async function loadUserViews(
  userId: string,
  scope?: ViewScope,
): Promise<SavedViewRow[]> {
  const rows = await prisma.savedView.findMany({
    where: scope ? { userId, scope } : { userId },
    orderBy: { createdAt: "asc" },
  });

  return rows.map(hydrateRow);
}

/**
 * Seed the 8 default view templates for a user if they have no views yet.
 * Idempotent — running it a second time is a no-op.
 */
export async function seedDefaults(userId: string): Promise<void> {
  const existing = await prisma.savedView.count({ where: { userId } });
  if (existing > 0) return;

  await prisma.savedView.createMany({
    data: DEFAULT_VIEWS.map((tpl) => ({
      userId,
      name: tpl.name,
      scope: tpl.scope,
      filters: JSON.stringify(tpl.filters),
      sort: tpl.sort ? JSON.stringify(tpl.sort) : null,
      columns: tpl.columns ? JSON.stringify(tpl.columns) : null,
      visibility: tpl.visibility,
    })),
  });
}
