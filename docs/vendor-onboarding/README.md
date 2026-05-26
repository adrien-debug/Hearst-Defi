# Vendor onboarding — Hearst Connect

State as of 2026-05-26. Updated when a vendor is moved from `pending` to `done`.

## Why this directory exists

Hearst Connect roadmap is 109/116 = 94%. The remaining 7 todos are not codable
— they are vendor accounts, an external audit, and one product call. This
folder collects the exact steps to close each external blocker, so any
operator can resume in one session without re-discovering URLs and field
names.

## Status

| Vendor / Action          | Status   | Owner | Doc                       |
| ------------------------ | -------- | ----- | ------------------------- |
| Persona (KYC prod)       | pending  | A.    | [persona.md](persona.md)   |
| DocuSign (sub agreements)| account opened (NA4) | A. | [docusign.md](docusign.md) |
| Fireblocks (custody)     | pending  | A.    | [fireblocks.md](fireblocks.md) |
| Spearbit (audit)         | pending  | A.    | [spearbit-email.md](spearbit-email.md) |
| `lp-landing-s0` decision | pending  | A.    | see below                  |

## Order to execute (fastest cash-in path)

1. **Spearbit email — today** (audit window 4 weeks, schedule one).
2. **Persona prod account — today** (self-serve 15 min).
3. **DocuSign template wiring — today** (account already opened: na4.docusign.net).
4. **Fireblocks compliance review — today** (sign-up triggers 24-72h compliance KYC).
5. **lp-landing-s0 decision** — see [the decision note](#lp-landing-s0-decision-required) below.

## Env vars to fill

All vendor secrets live in `.env.local` (gitignored). The empty template
ships at [.env.vendor-template](.env.vendor-template). Copy it into
`.env.local` and fill as you onboard each vendor. **Never commit a filled
`.env.local`.**

## `lp-landing-s0` decision required

Current state (per CLAUDE.md project notes and `src/proxy.ts`): `/` is the
login split-screen (wallet onboarding). The original `lp-landing-s0` item
asked for a marketing landing (track-record + "Request access" CTA) before
the login.

Two options:

- **Option A (recommended)** — Mark `lp-landing-s0` as `cancelled` in
  roadmap.json. The login split is the new front door. Marketing content
  lives on `hearst.app` (corporate site), not on `connect.hearst.app`.
- **Option B** — Build a marketing landing before login. Requires copy +
  design + ~1 day of dev. Defer until product brief is ready.

Default chosen here: **A** (cancelled). Override by editing roadmap.json
and bumping the version.

## When you finish a vendor

1. Move its row above from `pending` → `done`.
2. Mark the corresponding roadmap item `validated` via
   `/admin/roadmap` UI (or via Prisma directly).
3. Commit the doc change with the evidence URL (e.g. Persona Inquiry
   Template URL) — never paste the secret itself.
