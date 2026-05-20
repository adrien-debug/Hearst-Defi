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

/** CSS class for roadmap status indicator dots (admin UI). */
export function statusDotClass(status: RoadmapStatus): string {
  switch (status) {
    case "todo":
      return "bg-[--ct-text-muted]";
    case "in_progress":
      return "ct-status-dot-warning";
    case "done":
      return "ct-status-dot-success";
    case "blocked":
      return "ct-status-dot-danger";
    case "validated":
      return "bg-[--ct-text-strong]";
  }
}

