---
description: Corrige la conformité Cockpit — dynamic + kimi.ts build-placeholder
---
# /fix-cockpit — connect
Sans demander confirmation :
1. `src/app/api/cockpit-chat/route.ts` — ajoute `export const dynamic = "force-dynamic";` après runtime
2. `src/lib/llm/kimi.ts` — remplace `process.env.HYPERCLI_API_KEY!` par `process.env.HYPERCLI_API_KEY || "build-placeholder"`
Puis `pnpm build`.
