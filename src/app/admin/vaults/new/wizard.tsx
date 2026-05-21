"use client";

import { VaultForm } from "../_vault-form";

/**
 * VaultWizard — thin wrapper kept for backward-compat with new/page.tsx.
 * All form logic lives in `../_vault-form.tsx`.
 */
export function VaultWizard() {
  return <VaultForm mode="create" />;
}
