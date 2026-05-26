// src/lib/vaults/types.ts
//
// Shared discriminated union for vault references — imported by both
// slug.ts (pure, no server-only) and resolver.ts (server-only, DB).
// Keeping the type here avoids circular imports and ensures profile.ts
// and any client-safe consumer can import VaultRef without pulling in
// server-only or prisma.

import type { VaultDeployment } from "@prisma/client";
import type { VaultDefinition } from "@/lib/engine/vaults";

/** Discriminated union returned by the resolver and consumed by profile.ts. */
export type VaultRef =
  | { kind: "fixture"; fixture: VaultDefinition }
  | { kind: "deployment"; deployment: VaultDeployment };
