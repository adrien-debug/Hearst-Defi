import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Methodology v1.0 — single source of truth for projection assumptions.
 *
 * We read the markdown at module-load (server side) so:
 *   1) The exact contents are embedded in the system prompt that we cache.
 *   2) Any drift between the doc and the prompt is impossible — they are the
 *      same bytes.
 *
 * If the methodology is bumped to v1.1 we update the path here in a single
 * PR alongside the doc + an ADR, never silently.
 */

const METHODOLOGY_PATH = join(process.cwd(), "docs", "methodology", "v1.0.md");

export const METHODOLOGY_MD: string = readFileSync(METHODOLOGY_PATH, "utf8");

export const METHODOLOGY_VERSION = "v1.0" as const;
