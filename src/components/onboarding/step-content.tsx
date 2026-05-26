import { KycPlaceholder } from "@/components/onboarding/kyc-placeholder";
import { DocsignPlaceholder } from "@/components/onboarding/docsign-placeholder";

interface StepContentProps {
  path: "individual" | "corporate" | "fund";
  stepId: string;
}

/**
 * Maps a (path, stepId) pair to the appropriate step panel.
 * All heavy integrations (Persona, DocuSign) are represented by stubs.
 */
export function StepContent({ path, stepId }: StepContentProps) {
  // ── Individual path ──────────────────────────────────────────────────────────
  if (path === "individual") {
    if (stepId === "kyc") return <KycPlaceholder />;
    if (stepId === "accreditation") {
      return (
        <DocsignPlaceholder label="Accreditation — net worth or income certification" />
      );
    }
    if (stepId === "bank-wire") return <BankWirePanel />;
  }

  // ── Corporate path ───────────────────────────────────────────────────────────
  if (path === "corporate") {
    if (stepId === "entity-docs") {
      return (
        <DocsignPlaceholder label="Entity Documents — certificate of incorporation, operating agreement" />
      );
    }
    if (stepId === "ubo") {
      return (
        <DocsignPlaceholder label="UBO Declaration — ultimate beneficial owners ≥ 10%" />
      );
    }
    if (stepId === "kyc-officer") return <KycPlaceholder />;
    if (stepId === "bank-wire") return <BankWirePanel />;
  }

  // ── Fund path ────────────────────────────────────────────────────────────────
  if (path === "fund") {
    if (stepId === "fund-formation") {
      return (
        <DocsignPlaceholder label="Fund Formation — LPA, PPM, audited financial statements" />
      );
    }
    if (stepId === "aml") {
      return (
        <DocsignPlaceholder label="AML Compliance — compliance officer designation and policies" />
      );
    }
    if (stepId === "sub-advisor") {
      return (
        <DocsignPlaceholder label="Sub-Advisor Confirmation — delegated investment authority" />
      );
    }
    if (stepId === "master-account") {
      return (
        <DocsignPlaceholder label="Master Account Setup — omnibus account and allocation keys" />
      );
    }
  }

  // Fallback — should never be reached with valid data
  return (
    <div className="rounded-[var(--ct-radius-lg)] border border-[var(--ct-border)] bg-[var(--ct-surface-1)] px-6 py-10 text-center">
      <p className="text-sm text-[var(--ct-text-muted)]">
        Step content not found.
      </p>
    </div>
  );
}

/** Shared bank wire info panel (individual + corporate). */
function BankWirePanel() {
  return (
    <div className="rounded-[var(--ct-radius-lg)] border border-[var(--ct-border)] bg-[var(--ct-surface-1)] px-6 py-8">
      <h3 className="mb-4 text-sm font-semibold text-[var(--ct-text-strong)]">
        Bank Wire Setup
      </h3>
      <p className="mb-6 text-xs text-[var(--ct-text-muted)]">
        USDC distributions are delivered monthly to your designated bank
        account. Provide your wire instructions below. This is not a
        deposit — wire details are used for outbound distributions only.
      </p>
      <DocsignPlaceholder label="Bank Wire Instructions — SWIFT/IBAN details secured via DocuSign" />
    </div>
  );
}
