import { requireAdmin } from "@/lib/auth/require-admin";
import { resolveVault } from "@/lib/vaults/resolver";
import { cloneFormValues } from "@/lib/vaults/clone";
import { loadWizardDraft } from "../draft-actions";
import { VaultWizard } from "./wizard";
import { ResumeDraftBanner } from "./resume-banner";
import type { FormState } from "../_vault-form";

export const dynamic = "force-dynamic";

type Step =
  | "identity"
  | "economics"
  | "allocations"
  | "legal"
  | "governance"
  | "review_simulate"
  | "sign_deploy";

const STEP_LABELS: Record<Step, string> = {
  identity: "Identity & Strategy",
  economics: "Economics",
  allocations: "Allocations",
  legal: "Legal & SPV",
  governance: "Governance",
  review_simulate: "Review & Simulate",
  sign_deploy: "Sign & Deploy",
};

const STEP_NUMBERS: Record<Step, number> = {
  identity: 1,
  economics: 2,
  allocations: 3,
  legal: 4,
  governance: 5,
  review_simulate: 6,
  sign_deploy: 7,
};

interface NewVaultPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewVaultPage({ searchParams }: NewVaultPageProps) {
  await requireAdmin();

  const [draft, params] = await Promise.all([
    loadWizardDraft(),
    searchParams,
  ]);

  let resumeStep: Step | undefined;
  let resumeForm: Partial<FormState> | undefined;
  let draftUpdatedAt: Date | undefined;

  if (draft) {
    const rawStep = draft.step as Step;
    if (rawStep in STEP_LABELS) {
      resumeStep = rawStep;
    }
    try {
      resumeForm = JSON.parse(draft.formState) as Partial<FormState>;
    } catch {
      resumeForm = undefined;
    }
    draftUpdatedAt = draft.updatedAt;
  }

  // Resolve ?cloneFrom=<vaultIdOrSlug> — silently ignored if invalid
  let cloneValues: Partial<FormState> | undefined;
  const rawCloneFrom = params["cloneFrom"];
  const cloneFrom = typeof rawCloneFrom === "string" ? rawCloneFrom.trim() : "";
  if (cloneFrom.length > 0) {
    const sourceRef = await resolveVault(cloneFrom);
    if (sourceRef) {
      cloneValues = cloneFormValues(sourceRef);
    }
  }

  const stepLabel = resumeStep ? STEP_LABELS[resumeStep] : undefined;
  const stepNumber = resumeStep ? STEP_NUMBERS[resumeStep] : undefined;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow">Admin / Vaults</p>
        <h1 className="h1">New Vault Deployment</h1>
        <p className="body-md ct-text-muted max-w-xl">
          7-step wizard. Nothing is persisted until you click{" "}
          <span className="ct-text-primary">Submit for Review</span> on the last step.
        </p>
      </header>

      {draft && resumeStep && resumeForm && draftUpdatedAt && stepLabel && stepNumber && (
        <ResumeDraftBanner
          ticker={typeof resumeForm.ticker === "string" && resumeForm.ticker.length > 0
            ? resumeForm.ticker
            : undefined}
          stepLabel={stepLabel}
          stepNumber={stepNumber}
          updatedAt={draftUpdatedAt}
        />
      )}

      <VaultWizard resumeStep={resumeStep} resumeForm={resumeForm} cloneValues={cloneValues} />
    </div>
  );
}
