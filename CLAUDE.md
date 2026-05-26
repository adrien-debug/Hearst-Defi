# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Hearst Connect

Single-vault institutional DeFi platform. **Hearst Yield Vault.**

Mining-backed structured yield, monthly USDC distributions, target APY range 8–15%.
Cayman SPV structure, $250k min ticket, 60-day soft lock-up.

## Source of truth (read before any feature work)

- **Product spec**: `/docs/spec/*.mdx` — read the relevant spec file before coding
- **Methodology**: `/docs/methodology/v1.0.md` — immutable once published, bump version if change needed
- **Roadmap**: `/docs/roadmap.json` + `/admin/roadmap` UI — every PR must reference a roadmap item
- **Decisions**: `/docs/decisions/ADR-*.md` — Architecture Decision Records, append-only
- **Design system**: `/docs/DESIGN_SYSTEM.md` (visuel) + `/docs/design-lock.md` (🔒 **verrou** : liste exhaustive des tokens/primitives/classes autorisés, process pour demander un ajout). **Aucun nouveau token/primitive/classe sans validation explicite.**
- **Plan source**: `/Users/adrienbeyondcrypto/.claude/plans/tu-es-claude-opus-functional-eich.md`

## Non-negotiables (CI enforces most)

1. **APY always as range**, never single point. Output `"9.4-12.8%"` not `"11%"`.
2. **Every metric has a provenance badge**: Live / Oracle / Attested / Estimated / Manual / Stale.
3. **PTAI format mandatory** for simulations and rebalancing actions:
   Projection → Trigger → Action → Impact.
4. **No AI chat.** Agents produce structured JSON outputs only (see `/docs/spec/09-agents.mdx`).
5. **Forbidden words in agent outputs**: "guarantee", "promise", "certain", "will deliver", "risk-free".
6. **Scenario Engine is pure-function**: no DB, no fetch, no I/O in `src/lib/engine/*`.
7. **Monte Carlo allowed (V2, see ADR-006)** *alongside* the rule-based engine —
   rule-based stays the default. PRNG **seed must be injected** (engine purity #6
   still holds: no `Math.random()` ungoverned, no `Date.now()`). MC requires
   Methodology v2.0; headline APY stays a **range** (#1), MC only adds p5/p50/p95.
8. **Smart contracts**: testnet event logger Phase 2 ✅, ERC-4626 vault written +
   tested on Base Sepolia (Phase 3). **Mainnet deploy stays gated on a completed
   Spearbit audit + remediation** (ADR-006) — lifting the lock does NOT authorize
   unaudited mainnet code.
9. **Multi-vault allowed (V1+, see ADR-006)**: Yield / Defensive / BTC Plus. Vault id
   is a first-class key; each vault carries its own assumptions, share classes, and
   provenance — no vault reuses another's numbers silently.
10. Every projection must show its **assumptions** and a **"not guaranteed"** disclaimer.
11. **HARD RULE — no cross-project imports.** It is **forbidden** to copy, move, or import any
    component, file, asset, snippet, type, style, or dependency from `/Users/adrienbeyondcrypto/Dev/hearst-connect`
    (or any other sibling repo) into this codebase. That project is **read-only reference material**:
    you may open it to study patterns/structure, but every line shipped here must be **recoded
    from scratch** using this project's locked design system (Cockpit tokens) and conventions.
    No `git mv`, no copy-paste, no symlink, no new dependency added just because A had it.

## Méthode de travail visuel (RÈGLES ASSOUPLIES)

- **Initiative visuelle encouragée :** Les améliorations proactives (glassmorphism, lueurs/glows, dégradés radiaux premium) sont appréciées pour renforcer l'aspect institutionnel, tant qu'elles respectent globalement l'ambiance sombre et les couleurs de base.
- **Réversibilité.** Toute modif doit pouvoir être annulée vite. Pas de `git add/commit/push/reset` sans demande explicite.
- **Après chaque modif CSS/Turbopack** : `browser_close` puis re-`navigate` (sinon CSS servi en cache, Playwright garde l'ancien chunk).
- **Accent = vert `#A7FB90` principalement** (fond noir `--ct-bg-deep`). Le Glassmorphism = surfaces translucides, les lueurs ambiantes sont autorisées pour la profondeur.

## Stack

- Next.js 16 (App Router, Server Components by default)
- TypeScript strict (`noUncheckedIndexedAccess: true`, `noImplicitOverride`, `noFallthroughCasesInSwitch`)
- Tailwind CSS v4 (no `tailwind.config.js`, theme in `globals.css` `@theme` block)
- Prisma + Postgres (Supabase in production, SQLite for local dev — `DATABASE_URL=file:./prisma/dev.db`)
- Inngest for jobs and crons (V1)
- LLM provider: **Kimi K2.6 via Hypercli** (OpenAI-compatible endpoint, `openai@6.x` SDK pointed at `HYPERCLI_BASE_URL`). Single model for all 4 agents — ADR-007, decided 2026-05-26. No Anthropic SDK in this codebase.
- Foundry for smart contracts (Phase 2+)
- Package manager: **pnpm** (workspace declared in `pnpm-workspace.yaml`)
- Path alias: `@/*` → `./src/*`

## Common commands

```bash
pnpm dev                  # Next dev server (Turbopack root pinned in next.config.ts)
pnpm build                # Production build
pnpm start                # Run built app
pnpm lint                 # next lint (eslint-config-next + TS rules; no-any is error)
pnpm typecheck            # tsc --noEmit

pnpm db:generate          # prisma generate
pnpm db:push              # prisma db push (schema → SQLite dev.db, no migration history)
pnpm db:migrate           # prisma migrate dev (create + apply named migration)
pnpm db:studio            # Prisma Studio GUI
```

No test runner is wired up yet. Vitest is referenced in agent specs (`engine-dev`, `agent-dev`) as the
intended runner for engine snapshot tests and agent schema tests — add it under that umbrella when
introducing the first test, not standalone.

## Architecture — big picture

The repo today is a Next.js 16 App Router project with one product page (`/`) and a working **admin
console** (`/admin/*`). The product surfaces (Dashboard, Scenario Lab, Proof Center, Investor Memo)
and the engine/agents/contracts described in the plan are not yet built — they live in
`/docs/spec/*.mdx` and the roadmap.

### Layers that exist

- **`src/app/`** — App Router routes. `layout.tsx` loads Geist fonts and `globals.css`; Server
  Components are the default. `src/app/admin/` has its own sticky-header layout and three pages:
  `roadmap`, `spec`, `feedback`.
- **`src/lib/`** — server-side data access and shared types.
  - `db.ts` — global Prisma client singleton (cached on `globalThis` in dev to survive HMR).
  - `roadmap.ts` (server-only via `import "server-only"`) — reads `docs/roadmap.json` from disk,
    joins it with `RoadmapValidation` rows from Prisma, returns a derived
    `RoadmapPhaseWithState` tree with rollups.
  - `roadmap-types.ts` — pure types + label/symbol/variant helpers. Safe to import from client
    components; deliberately split from `roadmap.ts` to keep `server-only` out of client bundles.
  - `spec.ts` — reads MDX from `docs/spec/`, parses frontmatter with `gray-matter`, exposes
    `getSpecIndex()` / `getSpecDoc(slug)`.
  - `cn.ts` — `clsx` + `tailwind-merge` helper. Use this for every conditional className.
- **`src/components/ui/`** — atomic primitives (`Card`, `Metric`, `Badge`, `ProvenanceBadge`,
  `Button`, `Progress`). Tailwind v4 styled via CSS vars in `globals.css`.
- **`src/components/admin/`** — admin-specific composites (`RoadmapItemRow`, `FeedbackForm`,
  `FeedbackList`, `Markdown`, `StatusPill`).
- **`prisma/schema.prisma`** — 11 MVP tables grouped into: vault state (`VaultSnapshot`,
  `Allocation`), mining (`MiningMetric`), scenarios/backtests, events (`RebalanceEvent`,
  `Distribution`, `Proof`), reports, and admin (`RoadmapValidation`, `Feedback`). Provider is
  `sqlite` locally; flip to Postgres in `schema.prisma` + `DATABASE_URL` for production.

### How the admin roadmap flow works (canonical example of the patterns)

1. `docs/roadmap.json` is the static catalog of items, owned by product.
2. `RoadmapValidation` rows in Prisma hold per-item state (status, evidence URL, notes, blockers).
3. `getRoadmap()` in `src/lib/roadmap.ts` joins the two and computes per-week/per-phase
   `total`/`doneCount` rollups (a status is "done-like" if it's `done` or `validated`).
4. Server Actions in `src/app/admin/roadmap/actions.ts` (`"use server"`) upsert the validation row
   and call `revalidatePath("/admin/roadmap")`. There is no client-side fetching.
5. Form data is validated inline (status enum + trimmed strings); no `any`, no `as unknown as`.

Follow this shape — static doc → Prisma overlay → Server Component query → Server Action mutation —
for any new admin surface.

### Layers planned but not yet implemented

- **`src/lib/engine/`** — pure-function scenario/backtest/risk engine. **Must not** import
  `prisma`, `fetch`, `Date.now()`, `process.env`, or anything from `src/app/` or `src/components/`.
  See `.claude/agents/engine-dev.md`.
- **`src/lib/agents/`** — four LLM agents (Scenario Narrative, Mining Health, Risk
  Explanation, Investor Memo), all on **Kimi K2.6 via Hypercli** (OpenAI-compatible).
  Structured outputs only, Zod-validated, forbidden-words linter.
  See `.claude/agents/agent-dev.md` and `/docs/spec/09-agents.mdx`.
- **`contracts/`** — Foundry project: Phase 2 `EventLogger.sol` + `PoRRegistry.sol` on Base
  Sepolia, Phase 3 audited ERC-4626 vault. See `.claude/agents/sc-dev.md`.

## Conventions

- **Server Components by default.** `"use client"` only when interactivity requires it.
- **No `any`.** No `as unknown as`. If types fight you, fix the model. ESLint enforces this.
- **No `useEffect` for data fetching** — use Server Components or Server Actions.
- **Env vars validated by Zod at boot** (`src/lib/env.ts` — to be added).
- **All routes typed.** Use `next/link` not `<a href>`.
- **`server-only` import** at the top of any module that touches `fs`/`prisma` and could otherwise
  leak into a client bundle (see `src/lib/roadmap.ts` for the pattern).
- **Use `cn()` from `@/lib/cn`** for className merging — never raw template strings with conditional
  classes.
- **Dark mode only at MVP.** Colors come from CSS vars in `globals.css`; no `dark:` modifiers.
- **Tailwind v4 theme** is the single source of design tokens. Don't reintroduce a `tailwind.config.js`.

## Sub-agents available

The repo ships four specialist agents under `.claude/agents/` (invoke via `Agent` with the
`subagent_type` matching the name). Each one carries its own scope, file ownership, and
"forbidden" list:

- **`engine-dev`** — owns `src/lib/engine/*`. Refuses UI work and any I/O inside engine code.
- **`agent-dev`** — owns `src/lib/agents/*`. Enforces structured outputs, single-model pinning
  (Kimi K2.6 via Hypercli — ADR-007). Prompt caching is no-op (Kimi has no native cache).
- **`sc-dev`** — owns `contracts/*`. Foundry only, OpenZeppelin primitives, phased rollout.
- **`ui-dev`** — owns `src/app/*` and `src/components/*`. Refuses business logic outside the
  engine.

Use them whenever the task is squarely inside one of those scopes; their constraints are stricter
than this file and act as the local source of truth for those directories.

## Before any feature work

1. Read the related `/docs/spec/*.mdx`
2. Check `/admin/roadmap` for the item status
3. Code
4. Update roadmap status (via UI) + paste evidence URL in the item
5. Add a line to the ADR if a non-trivial decision was made

## When in doubt

Open the plan file: `/Users/adrienbeyondcrypto/.claude/plans/tu-es-claude-opus-functional-eich.md`.
It's the master vision. If the plan and the code diverge, the plan wins — update the code, not the plan, unless the plan is wrong (then update the plan first).
