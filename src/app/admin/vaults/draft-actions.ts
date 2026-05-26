"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { FormState } from "./_vault-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WizardDraftRow {
  id: string;
  userId: string;
  formState: string;
  step: string;
  updatedAt: Date;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// saveWizardStep — upsert draft for current admin
// ---------------------------------------------------------------------------

export async function saveWizardStep(
  stepKey: string,
  partial: Partial<FormState>,
): Promise<void> {
  const admin = await requireAdmin();

  // Load existing draft to merge partial on top
  const existing = await prisma.vaultDraft.findUnique({
    where: { userId: admin.userId },
  });

  let merged: Partial<FormState>;
  if (existing) {
    try {
      const stored = JSON.parse(existing.formState) as Partial<FormState>;
      merged = { ...stored, ...partial };
    } catch {
      merged = partial;
    }
  } else {
    merged = partial;
  }

  await prisma.vaultDraft.upsert({
    where: { userId: admin.userId },
    create: {
      userId: admin.userId,
      formState: JSON.stringify(merged),
      step: stepKey,
    },
    update: {
      formState: JSON.stringify(merged),
      step: stepKey,
    },
  });
}

// ---------------------------------------------------------------------------
// loadWizardDraft — query by current admin
// ---------------------------------------------------------------------------

export async function loadWizardDraft(): Promise<WizardDraftRow | null> {
  const admin = await requireAdmin();

  const row = await prisma.vaultDraft.findUnique({
    where: { userId: admin.userId },
  });

  return row;
}

// ---------------------------------------------------------------------------
// discardWizardDraft — delete draft for current admin
// ---------------------------------------------------------------------------

export async function discardWizardDraft(): Promise<void> {
  const admin = await requireAdmin();

  await prisma.vaultDraft.deleteMany({
    where: { userId: admin.userId },
  });
}
