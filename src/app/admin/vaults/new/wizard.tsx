"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ApyRange } from "@/components/ui/apy-range";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createDraftVault, type CreateDraftInput } from "../actions";

// ---------------------------------------------------------------------------
// Step types
// ---------------------------------------------------------------------------

type Step = "identity" | "economics" | "legal" | "allocations" | "review";

const STEPS: { key: Step; label: string }[] = [
  { key: "identity", label: "Identity" },
  { key: "economics", label: "Economics" },
  { key: "legal", label: "Legal" },
  { key: "allocations", label: "Allocations" },
  { key: "review", label: "Review" },
];

// ---------------------------------------------------------------------------
// Initial form state
// ---------------------------------------------------------------------------

type FormState = CreateDraftInput & { colorTag: string };

const INITIAL: FormState = {
  ticker: "",
  name: "",
  description: "",
  strategy: "mining_yield",
  colorTag: "accent",
  minTicketUsdc: 250000,
  capacityUsdc: 10000000,
  mgmtFeeBps: 200,
  perfFeeBps: 2000,
  softLockupDays: 60,
  targetApyLowBps: 800,
  targetApyHighBps: 1500,
  spvJurisdiction: "cayman",
  shareClass: "A",
  regExemption: "regD_506c",
  disclaimers:
    "This vault is offered exclusively to qualified purchasers as defined in Section 2(a)(51) of the Investment Company Act. Past performance is not indicative of future results. This is not a solicitation or offer in any jurisdiction where such offer is unlawful. Distributions are not guaranteed and are subject to operational performance.",
  targetMiningBps: 5000,
  targetBtcTacticalBps: 2500,
  targetUsdcBaseBps: 1500,
  targetStableReserveBps: 1000,
  signersWhitelist: ["", ""],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(bps: number) {
  return (bps / 100).toFixed(1);
}

function inputClass(extra?: string) {
  return `ct-input w-full ${extra ?? ""}`;
}

// ---------------------------------------------------------------------------
// Wizard component
// ---------------------------------------------------------------------------

export function VaultWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identity");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const progressPct = ((stepIndex + 1) / STEPS.length) * 100;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setNumber(key: keyof FormState, raw: string) {
    const n = parseFloat(raw);
    if (!isNaN(n)) set(key, n as FormState[typeof key]);
  }

  function setAllocationBps(key: keyof FormState, raw: string) {
    const n = Math.round(parseFloat(raw));
    if (!isNaN(n)) set(key, n as FormState[typeof key]);
  }

  function allocTotal() {
    return (
      form.targetMiningBps +
      form.targetBtcTacticalBps +
      form.targetUsdcBaseBps +
      form.targetStableReserveBps
    );
  }

  function nextStep() {
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]!.key);
  }

  function prevStep() {
    const idx = STEPS.findIndex((s) => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1]!.key);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const input: CreateDraftInput = {
        ticker: form.ticker,
        name: form.name,
        description: form.description,
        strategy: form.strategy,
        colorTag: form.colorTag,
        minTicketUsdc: form.minTicketUsdc,
        capacityUsdc: form.capacityUsdc,
        mgmtFeeBps: form.mgmtFeeBps,
        perfFeeBps: form.perfFeeBps,
        softLockupDays: form.softLockupDays,
        targetApyLowBps: form.targetApyLowBps,
        targetApyHighBps: form.targetApyHighBps,
        spvJurisdiction: form.spvJurisdiction,
        shareClass: form.shareClass,
        regExemption: form.regExemption,
        disclaimers: form.disclaimers,
        targetMiningBps: form.targetMiningBps,
        targetBtcTacticalBps: form.targetBtcTacticalBps,
        targetUsdcBaseBps: form.targetUsdcBaseBps,
        targetStableReserveBps: form.targetStableReserveBps,
        signersWhitelist: form.signersWhitelist.filter((s) => s.trim().length > 0),
      };

      const result = await createDraftVault(input);
      if (!result.ok) {
        const msg =
          typeof result.issues === "string"
            ? result.issues
            : result.issues.map((i) => i.message).join(", ");
        setError(msg);
        return;
      }
      router.push(`/admin/vaults/${result.id}`);
    });
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={
                i === stepIndex
                  ? "body-sm font-semibold text-[--ct-text-strong]"
                  : i < stepIndex
                    ? "body-sm text-[--ct-text-muted]"
                    : "body-sm text-[--ct-text-faint]"
              }
            >
              {s.label}
            </span>
          ))}
        </div>
        <Progress value={progressPct} label="Wizard progress" />
      </div>

      <Card>
        {/* Step 1 — Identity */}
        {step === "identity" && (
          <div className="space-y-6">
            <CardTitle>Identity</CardTitle>

            <label className="block space-y-1.5">
              <span className="stat-label">Ticker *</span>
              <input
                className={inputClass()}
                value={form.ticker}
                onChange={(e) => set("ticker", e.target.value.toUpperCase())}
                placeholder="HYV-A"
                maxLength={12}
              />
              <span className="body-xs text-[--ct-text-faint]">
                3-12 uppercase letters, digits, hyphens
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="stat-label">Name *</span>
              <input
                className={inputClass()}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Hearst Yield Vault — Series A"
                maxLength={80}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="stat-label">Strategy *</span>
              <select
                className={inputClass("ct-select")}
                value={form.strategy}
                onChange={(e) =>
                  set("strategy", e.target.value as FormState["strategy"])
                }
              >
                <option value="mining_yield">Mining Yield</option>
                <option value="btc_tactical">BTC Tactical</option>
                <option value="stable_reserve">Stable Reserve</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="stat-label">Description</span>
              <textarea
                className={inputClass("ct-textarea")}
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Optional — brief fund description for admin UI"
              />
            </label>
          </div>
        )}

        {/* Step 2 — Economics */}
        {step === "economics" && (
          <div className="space-y-6">
            <CardTitle>Economics</CardTitle>

            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="stat-label">Min Ticket (USDC) *</span>
                <input
                  type="number"
                  className={inputClass()}
                  value={form.minTicketUsdc}
                  onChange={(e) => setNumber("minTicketUsdc", e.target.value)}
                  min={1000}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="stat-label">Capacity (USDC) *</span>
                <input
                  type="number"
                  className={inputClass()}
                  value={form.capacityUsdc}
                  onChange={(e) => setNumber("capacityUsdc", e.target.value)}
                  min={1000}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="stat-label">Mgmt Fee (bps) *</span>
                <input
                  type="number"
                  className={inputClass()}
                  value={form.mgmtFeeBps}
                  onChange={(e) => setNumber("mgmtFeeBps", e.target.value)}
                  min={0}
                  max={500}
                />
                <span className="body-xs text-[--ct-text-faint]">
                  {pct(form.mgmtFeeBps)}% annually
                </span>
              </label>

              <label className="block space-y-1.5">
                <span className="stat-label">Perf Fee (bps) *</span>
                <input
                  type="number"
                  className={inputClass()}
                  value={form.perfFeeBps}
                  onChange={(e) => setNumber("perfFeeBps", e.target.value)}
                  min={0}
                  max={3000}
                />
                <span className="body-xs text-[--ct-text-faint]">
                  {pct(form.perfFeeBps)}% of profits
                </span>
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="stat-label">Soft Lock-up (days) *</span>
              <input
                type="number"
                className={inputClass()}
                value={form.softLockupDays}
                onChange={(e) => setNumber("softLockupDays", e.target.value)}
                min={0}
                max={365}
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="stat-label">Target APY Low (bps) *</span>
                <input
                  type="number"
                  className={inputClass()}
                  value={form.targetApyLowBps}
                  onChange={(e) => setNumber("targetApyLowBps", e.target.value)}
                  min={0}
                />
                <span className="body-xs text-[--ct-text-faint]">{pct(form.targetApyLowBps)}%</span>
              </label>

              <label className="block space-y-1.5">
                <span className="stat-label">Target APY High (bps) *</span>
                <input
                  type="number"
                  className={inputClass()}
                  value={form.targetApyHighBps}
                  onChange={(e) => setNumber("targetApyHighBps", e.target.value)}
                  min={0}
                />
                <span className="body-xs text-[--ct-text-faint]">{pct(form.targetApyHighBps)}%</span>
              </label>
            </div>

            <div className="p-4 rounded-lg bg-bg-elevated border border-border-subtle">
              <span className="stat-label block mb-1">APY Range Preview</span>
              <ApyRange
                low={form.targetApyLowBps / 100}
                high={form.targetApyHighBps / 100}
                precision={1}
              />
            </div>
          </div>
        )}

        {/* Step 3 — Legal */}
        {step === "legal" && (
          <div className="space-y-6">
            <CardTitle>Legal</CardTitle>

            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="stat-label">SPV Jurisdiction *</span>
                <select
                  className={inputClass("ct-select")}
                  value={form.spvJurisdiction}
                  onChange={(e) =>
                    set("spvJurisdiction", e.target.value as FormState["spvJurisdiction"])
                  }
                >
                  <option value="cayman">Cayman Islands</option>
                  <option value="bvi">British Virgin Islands</option>
                  <option value="delaware">Delaware</option>
                  <option value="lux">Luxembourg</option>
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="stat-label">Share Class *</span>
                <input
                  className={inputClass()}
                  value={form.shareClass}
                  onChange={(e) => set("shareClass", e.target.value.toUpperCase().slice(0, 1))}
                  placeholder="A"
                  maxLength={1}
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="stat-label">Regulatory Exemption *</span>
              <select
                className={inputClass("ct-select")}
                value={form.regExemption}
                onChange={(e) =>
                  set("regExemption", e.target.value as FormState["regExemption"])
                }
              >
                <option value="regD_506c">Reg D 506(c) — US Accredited</option>
                <option value="regS">Reg S — Non-US investors</option>
                <option value="art2_lux">Art. 2 Lux — Qualified Investors</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="stat-label">Disclaimers * (min 80 chars)</span>
              <textarea
                className={inputClass("ct-textarea")}
                value={form.disclaimers}
                onChange={(e) => set("disclaimers", e.target.value)}
                rows={6}
                placeholder="Required legal disclaimers. Must include 'not guaranteed' and assumptions..."
              />
              <span className="body-xs text-[--ct-text-faint]">
                {form.disclaimers.length} chars — restricted terms will be flagged on submit
              </span>
            </label>
          </div>
        )}

        {/* Step 4 — Allocations */}
        {step === "allocations" && (
          <div className="space-y-6">
            <CardTitle>Allocations</CardTitle>
            <p className="body-sm text-[--ct-text-muted]">
              Must sum to exactly 10 000 bps (100%). Currently:{" "}
              <span
                className={
                  allocTotal() === 10000
                    ? "font-semibold text-[--ct-status-success]"
                    : "font-semibold text-[--ct-status-danger]"
                }
              >
                {allocTotal()} / 10 000
              </span>
            </p>

            {(
              [
                { key: "targetMiningBps", label: "Mining" },
                { key: "targetBtcTacticalBps", label: "BTC Tactical" },
                { key: "targetUsdcBaseBps", label: "USDC Base" },
                { key: "targetStableReserveBps", label: "Stable Reserve" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="stat-label">{label}</span>
                  <span className="mono tabular text-sm text-[--ct-text-primary]">
                    {pct(form[key])}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10000}
                  step={50}
                  value={form[key]}
                  onChange={(e) => setAllocationBps(key, e.target.value)}
                  className="w-full accent-accent"
                  aria-label={`${label} allocation`}
                />
                <Progress value={form[key]} max={10000} label={`${label} allocation`} />
              </div>
            ))}
          </div>
        )}

        {/* Step 5 — Review */}
        {step === "review" && (
          <div className="space-y-6">
            <CardTitle>Review &amp; Submit</CardTitle>

            <div className="space-y-3 divide-y divide-border-subtle">
              <div className="grid grid-cols-2 gap-2 pb-3">
                <span className="stat-label">Ticker</span>
                <span className="mono tabular text-sm text-[--ct-text-strong]">{form.ticker}</span>
                <span className="stat-label">Name</span>
                <span className="body-sm text-[--ct-text-primary]">{form.name}</span>
                <span className="stat-label">Strategy</span>
                <span className="body-sm text-[--ct-text-primary]">{form.strategy}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 py-3">
                <span className="stat-label">Min Ticket</span>
                <span className="mono tabular text-sm">${form.minTicketUsdc.toLocaleString()}</span>
                <span className="stat-label">Capacity</span>
                <span className="mono tabular text-sm">${form.capacityUsdc.toLocaleString()}</span>
                <span className="stat-label">Fees</span>
                <span className="mono tabular text-sm">
                  {pct(form.mgmtFeeBps)}% mgmt / {pct(form.perfFeeBps)}% perf
                </span>
                <span className="stat-label">Lockup</span>
                <span className="mono tabular text-sm">{form.softLockupDays} days</span>
                <span className="stat-label">Target APY</span>
                <ApyRange
                  low={form.targetApyLowBps / 100}
                  high={form.targetApyHighBps / 100}
                  precision={1}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 py-3">
                <span className="stat-label">SPV</span>
                <span className="body-sm text-[--ct-text-primary]">{form.spvJurisdiction}</span>
                <span className="stat-label">Share Class</span>
                <span className="body-sm">{form.shareClass}</span>
                <span className="stat-label">Reg Exemption</span>
                <span className="body-sm">{form.regExemption}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 py-3">
                <span className="stat-label">Mining</span>
                <span className="mono tabular text-sm">{pct(form.targetMiningBps)}%</span>
                <span className="stat-label">BTC Tactical</span>
                <span className="mono tabular text-sm">{pct(form.targetBtcTacticalBps)}%</span>
                <span className="stat-label">USDC Base</span>
                <span className="mono tabular text-sm">{pct(form.targetUsdcBaseBps)}%</span>
                <span className="stat-label">Stable Reserve</span>
                <span className="mono tabular text-sm">{pct(form.targetStableReserveBps)}%</span>
                <span className="stat-label">Total</span>
                <span
                  className={
                    allocTotal() === 10000
                      ? "mono tabular text-sm text-[--ct-status-success] font-semibold"
                      : "mono tabular text-sm text-[--ct-status-danger] font-semibold"
                  }
                >
                  {pct(allocTotal())}%
                </span>
              </div>
            </div>

            {/* Signers whitelist */}
            <div className="space-y-3">
              <span className="stat-label block">Signers Whitelist (2–5 wallet addresses) *</span>
              {form.signersWhitelist.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={inputClass("flex-1")}
                    value={s}
                    onChange={(e) => {
                      const next = [...form.signersWhitelist];
                      next[i] = e.target.value;
                      set("signersWhitelist", next);
                    }}
                    placeholder={`0x… signer ${i + 1}`}
                  />
                  {form.signersWhitelist.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        const next = form.signersWhitelist.filter((_, j) => j !== i);
                        set("signersWhitelist", next);
                      }}
                      aria-label="Remove signer"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              {form.signersWhitelist.length < 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => set("signersWhitelist", [...form.signersWhitelist, ""])}
                >
                  + Add signer
                </Button>
              )}
            </div>

            <p className="body-xs text-[--ct-text-faint] border-t border-border-subtle pt-3">
              Assumptions: mining yields, BTC price, network difficulty, energy costs are
              projected based on historical ranges. Target APY is not guaranteed and may vary.
              Past performance is not indicative of future results.
            </p>
          </div>
        )}

        {/* Navigation */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-danger-bg border border-danger-border">
            <p className="body-sm text-[--ct-status-danger]">{error}</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={prevStep}
            disabled={stepIndex === 0}
          >
            Back
          </Button>

          <div className="flex items-center gap-3">
            {stepIndex < STEPS.length - 1 ? (
              <Button variant="primary" size="md" type="button" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                type="button"
                onClick={handleSubmit}
                disabled={isPending || allocTotal() !== 10000}
              >
                {isPending ? "Creating…" : "Create Draft"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
