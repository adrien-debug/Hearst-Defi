# Spearbit — Audit kickoff email

**To:** team@spearbit.com
**Cc:** adrien@hearstcorporation.io
**Subject:** Hearst Connect — Audit engagement request for Phase 3 ERC-4626 vault

---

## Email body (ready to copy-paste)

```
Hi Spearbit team,

We're Hearst Connect, a single-vault institutional DeFi platform targeting
Cayman SPV LPs with mining-backed yield (target APY 8-15%, $250k min ticket).
Repo: https://github.com/Hearst-Corporation/Hearst-Defi

We'd like to engage Spearbit for a formal audit of our Phase 3 contracts
before mainnet deployment on Base. In scope:

  - contracts/src/EventLogger.sol
  - contracts/src/PoRRegistry.sol
  - contracts/src/HearstYieldVault.sol (ERC-4626 vault)

Our pre-audit pack is published in the repo at:
  docs/audit/spearbit-prep-2026-05-26/

It includes:
  - scope.md (contracts + web/API surface + invariants)
  - threat-model.md (8 attack surfaces with primary + secondary mitigations)
  - previous-findings.md (9 self-identified pre-audit items PRE-01..PRE-09)
  - abi-freeze.json (forge build instructions, ABI placeholders)

Commit SHA at pack creation: 8ba18c99. We will refresh to the latest commit
before kickoff to freeze the audit target.

Engagement parameters we'd propose:
  - Budget envelope: $80k–$150k
  - Audit window: 4 weeks
  - Remediation window: 2 weeks post-report, with re-audit included
  - Format: Spearbit researcher allocation (1-2 senior auditors)
  - Communication: shared Slack/Discord + weekly sync

Backup audit firms we'll approach if you can't fit the window:
  - Trail of Bits
  - OpenZeppelin Security

Could you share availability for a kickoff call this week or next?
Paris-based, FR/EN, flexible on timezone.

Best,
Adrien Hostachy
Hearst Connect
adrien@hearstcorporation.io
```

---

## After they reply

Expected back-and-forth:

1. **NDA exchange** (1-2 days). They send theirs, you can sign or counter
   with yours.
2. **Scope call** (30-60 min). Walk them through the 3 contracts, the threat
   model, and the integration surfaces (Safe v1.4 + TimelockController).
3. **Quote** (3-5 days). Itemised: contract LoC, complexity multipliers,
   total researcher-weeks.
4. **Contract signature.** Typically a SAFE template, paid 50/50 (kickoff /
   delivery).
5. **Kickoff.** Repo freeze SHA, Slack/Discord channel created, audit
   document started.

## What to provide on kickoff

- Frozen commit SHA (we'll update `scope.md` line "Commit SHA at pack
  creation: 8ba18c99" to the final one).
- `forge build` artifacts (`out/`) including ABIs and storage layouts.
- `forge test --gas-report` output.
- Slither + Mythril + Aderyn static-analysis runs (we'll do these ourselves
  the day before).
- A 1-page architecture diagram (PoR registry + EventLogger + vault interactions).

## If Spearbit declines or can't fit timeline

Use the same body, change recipient:

- **Trail of Bits:** info@trailofbits.com — typically 4-6 week wait, $100-200k
  for vault-scale audit.
- **OpenZeppelin Security:** security@openzeppelin.com — usually faster but
  pricier, $120-180k for a 4-week engagement.

## Mark `audit-final` validated

Once the audit report is delivered, remediation is merged, and Spearbit
re-runs the audit signing off:

```ts
await prisma.roadmapValidation.update({
  where: { itemId: "audit-final" },
  data: {
    status: "validated",
    validatedBy: "adrien@hearstcorporation.io",
    validatedAt: new Date(),
    evidenceUrl: "https://spearbit.com/reports/hearst-connect-2026-XX.pdf",
    notes: "Spearbit audit completed, all findings remediated, re-audit clean.",
  },
});
```

This unblocks `vault-mainnet` (still gated on the audit).
