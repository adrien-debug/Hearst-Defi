import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/db";
import type {
  RoadmapDocument,
  RoadmapItemWithState,
  RoadmapPhaseWithState,
  RoadmapStatus,
  RoadmapWeekWithState,
} from "@/lib/roadmap-types";

const ROADMAP_PATH = path.join(process.cwd(), "docs", "roadmap.json");
const DONE_LIKE: RoadmapStatus[] = ["done", "validated"];

async function loadRoadmapFromDisk(): Promise<RoadmapDocument> {
  const raw = await fs.readFile(ROADMAP_PATH, "utf8");
  return JSON.parse(raw) as RoadmapDocument;
}

export async function getRoadmap(): Promise<{
  version: string;
  phases: RoadmapPhaseWithState[];
}> {
  const doc = await loadRoadmapFromDisk();
  const validations = await prisma.roadmapValidation.findMany();
  const byId = new Map(validations.map((v) => [v.itemId, v]));

  const phases: RoadmapPhaseWithState[] = doc.phases.map((phase) => {
    let phaseTotal = 0;
    let phaseDone = 0;

    const weeks: RoadmapWeekWithState[] = phase.weeks.map((week) => {
      let doneCount = 0;
      const items: RoadmapItemWithState[] = week.items.map((item) => {
        const v = byId.get(item.id);
        const status: RoadmapStatus = (v?.status as RoadmapStatus) ?? "todo";
        if (DONE_LIKE.includes(status)) doneCount += 1;
        return {
          ...item,
          status,
          validatedBy: v?.validatedBy ?? null,
          validatedAt: v?.validatedAt ?? null,
          notes: v?.notes ?? null,
          blockers: v?.blockers ?? null,
          evidenceUrl: v?.evidenceUrl ?? null,
          updatedAt: v?.updatedAt ?? null,
        };
      });
      phaseTotal += items.length;
      phaseDone += doneCount;
      return { ...week, items, total: items.length, doneCount };
    });

    return {
      ...phase,
      weeks,
      total: phaseTotal,
      doneCount: phaseDone,
    };
  });

  return { version: doc.version, phases };
}
