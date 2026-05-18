// Pure types + helpers — safe to import from client components.
// Anything that needs fs/db lives in roadmap.ts (server-only).

export type RoadmapStatus =
  | "todo"
  | "in_progress"
  | "done"
  | "blocked"
  | "validated";

export interface RoadmapItem {
  id: string;
  label: string;
  owner: string;
  spec_ref: string | null;
}

export interface RoadmapWeek {
  id: string;
  label: string;
  items: RoadmapItem[];
}

export interface RoadmapPhase {
  id: string;
  label: string;
  weeks: RoadmapWeek[];
}

export interface RoadmapDocument {
  version: string;
  phases: RoadmapPhase[];
}

export interface RoadmapItemWithState extends RoadmapItem {
  status: RoadmapStatus;
  validatedBy: string | null;
  validatedAt: Date | null;
  notes: string | null;
  blockers: string | null;
  evidenceUrl: string | null;
  updatedAt: Date | null;
}

export interface RoadmapWeekWithState extends Omit<RoadmapWeek, "items"> {
  items: RoadmapItemWithState[];
  total: number;
  doneCount: number;
}

export interface RoadmapPhaseWithState
  extends Omit<RoadmapPhase, "weeks"> {
  weeks: RoadmapWeekWithState[];
  total: number;
  doneCount: number;
}

export function statusLabel(status: RoadmapStatus): string {
  switch (status) {
    case "todo":
      return "To do";
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
    case "blocked":
      return "Blocked";
    case "validated":
      return "Validated";
  }
}

export function statusDotColor(status: RoadmapStatus): string {
  switch (status) {
    case "todo":
      return "var(--ct-text-muted)";
    case "in_progress":
      return "var(--ct-status-warning)";
    case "done":
      return "var(--ct-status-success)";
    case "blocked":
      return "var(--ct-status-danger)";
    case "validated":
      return "var(--ct-text-strong)";
  }
}

export function statusBadgeVariant(
  status: RoadmapStatus,
): "default" | "success" | "warning" | "danger" | "brand" {
  switch (status) {
    case "todo":
      return "default";
    case "in_progress":
      return "warning";
    case "done":
      return "success";
    case "validated":
      return "brand";
    case "blocked":
      return "danger";
  }
}
