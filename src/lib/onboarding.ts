import "server-only";

import { prisma } from "@/lib/db";
import type { OnboardingPath } from "@/lib/onboarding-types";

export interface OnboardingProgressRow {
  id: string;
  userId: string;
  path: string;
  currentStep: number;
  data: string;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Fetch or create the progress row for a given user + path. */
export async function getOrCreateProgress(
  userId: string,
  path: OnboardingPath,
): Promise<OnboardingProgressRow> {
  const existing = await prisma.onboardingProgress.findUnique({
    where: { userId_path: { userId, path } },
  });

  if (existing) return existing;

  return prisma.onboardingProgress.create({
    data: { userId, path },
  });
}

/** Advance (or set) the current step and persist partial step data. */
export async function saveStepProgress(
  userId: string,
  path: OnboardingPath,
  currentStep: number,
  data: Record<string, unknown>,
): Promise<OnboardingProgressRow> {
  return prisma.onboardingProgress.upsert({
    where: { userId_path: { userId, path } },
    create: {
      userId,
      path,
      currentStep,
      data: JSON.stringify(data),
    },
    update: {
      currentStep,
      data: JSON.stringify(data),
    },
  });
}

/** Mark onboarding as complete. */
export async function completeOnboarding(
  userId: string,
  path: OnboardingPath,
): Promise<OnboardingProgressRow> {
  return prisma.onboardingProgress.upsert({
    where: { userId_path: { userId, path } },
    create: {
      userId,
      path,
      currentStep: 999,
      completedAt: new Date(),
    },
    update: {
      completedAt: new Date(),
    },
  });
}
