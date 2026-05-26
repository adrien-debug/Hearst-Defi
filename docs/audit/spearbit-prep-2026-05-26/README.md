# Spearbit Audit Preparation Pack — Hearst Yield Vault

**Prepared by:** Hearst Corporation DeFi Engineering  
**Contact:** adrien@hearstcorporation.io  
**Pack date:** 2026-05-26  
**Codebase freeze SHA:** `8ba18c99a5b1ebce225ca3dbce7d4c9372a4be24`

---

## Product Overview

Hearst Yield Vault is a single-vault institutional DeFi product offering mining-backed structured yield with monthly USDC distributions. Target APY range: 8–15% (presented always as a range, never a single point). Minimum ticket: $250,000 USD. Soft lock-up: 60 days. Legal structure: Cayman SPV.

The system is composed of:

- **Three Solidity contracts** deployed on Base (testnet phase) and targeted for Base mainnet post-audit.
- **A Next.js 16 admin console** for operational governance (roadmap, feedback, proof management).
- **A pure-function scenario engine** (`src/lib/engine/`) with no I/O.
- **Four LLM agents** producing structured JSON outputs (no chat interface).
- **Inngest** for background jobs and cron-based distribution scheduling.
- **Fireblocks** integration for off-chain custody (Viewer read-only, already covered by Fireblocks' own compliance programme).

---

## Audit Firm Shortlist

| Priority | Firm | Rationale |
|---|---|---|
| Primary | **Spearbit** | ERC-4626 depth (multiple vault audits), Base ecosystem familiarity, structured re-audit SLA |
| Backup A | **Trail of Bits** | Strong static analysis (Slither, Echidna), complementary tooling to Spearbit |
| Backup B | **OpenZeppelin Security** | OZ primitive authorship — direct knowledge of ReentrancyGuard and ERC-4626 internals |

---

## Budget & Timeline

| Line item | Estimate |
|---|---|
| Primary audit (4 weeks) | $80,000 – $150,000 |
| Remediation window | 2 weeks post-report delivery |
| Re-audit (fixes only) | Included in primary budget |
| Total ceiling | $150,000 |

### Milestone Table

| Date | Milestone |
|---|---|
| 2026-05-26 | Prep pack frozen at SHA `8ba18c99` |
| 2026-06-02 | NDA + scope agreement signed |
| 2026-06-09 | Kick-off call, access provisioned |
| 2026-06-10 | Audit start (Week 1) |
| 2026-07-08 | Preliminary findings delivered |
| 2026-07-15 | Remediation complete (team) |
| 2026-07-22 | Re-audit complete |
| 2026-07-25 | Final report published |
| 2026-07-28 | Mainnet deploy gate lifted (pending Spearbit sign-off + ADR-006 remediation) |

---

## Codebase Freeze

The contracts submitted for audit are pinned at commit:

```
8ba18c99a5b1ebce225ca3dbce7d4c9372a4be24
```

No changes to `contracts/src/` will be merged between freeze and re-audit completion without explicit auditor notification and scope re-confirmation.

---

## Pack Contents

| File | Purpose |
|---|---|
| `README.md` | This file — overview, firms, budget, timeline |
| `scope.md` | Exact in-scope / out-of-scope boundaries |
| `threat-model.md` | Trust model, asset flows, attack surfaces, mitigations |
| `previous-findings.md` | Pre-audit self-identified findings (PRE-01 to PRE-09) |
| `abi-freeze.json` | ABI placeholder (to be compiled from frozen SHA) |
