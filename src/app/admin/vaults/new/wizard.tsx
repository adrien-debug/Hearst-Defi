"use client";

import { VaultForm, type FormState } from "../_vault-form";

type Step =
  | "identity"
  | "economics"
  | "allocations"
  | "legal"
  | "governance"
  | "review_simulate"
  | "sign_deploy";

interface VaultWizardProps {
  resumeStep?: Step;
  resumeForm?: Partial<FormState>;
  /** Pre-fill values derived from a ?cloneFrom= query param. Applied after
   *  resumeForm so a persisted draft (explicit resume) takes precedence. */
  cloneValues?: Partial<FormState>;
}

/**
 * VaultWizard — thin wrapper kept for backward-compat with new/page.tsx.
 * All form logic lives in `../_vault-form.tsx`.
 */
export function VaultWizard({ resumeStep, resumeForm, cloneValues }: VaultWizardProps) {
  // Merge order: FORM_INITIAL < cloneValues < resumeForm (explicit draft wins)
  const mergedResume: Partial<FormState> | undefined =
    cloneValues ?? resumeForm
      ? { ...cloneValues, ...resumeForm }
      : undefined;

  return <VaultForm mode="create" resumeStep={resumeStep} resumeForm={mergedResume} />;
}
