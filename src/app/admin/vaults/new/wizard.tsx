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
}

/**
 * VaultWizard — thin wrapper kept for backward-compat with new/page.tsx.
 * All form logic lives in `../_vault-form.tsx`.
 */
export function VaultWizard({ resumeStep, resumeForm }: VaultWizardProps) {
  return <VaultForm mode="create" resumeStep={resumeStep} resumeForm={resumeForm} />;
}
