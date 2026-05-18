"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";

function asString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function postFeedback(formData: FormData): Promise<void> {
  // Rate limit: 5 feedback submissions per minute globally
  await assertRateLimit("post-feedback", 5, 60_000);

  // Require authentication for feedback (prevents anonymous spam)
  await requireAuth();

  const message = asString(formData.get("message"));
  if (!message) return;

  const itemId = asString(formData.get("itemId"));
  const pathname = asString(formData.get("pathname"));
  const author = asString(formData.get("author"));

  await prisma.feedback.create({
    data: { message, itemId, pathname, author },
  });

  revalidatePath("/admin/feedback");
}

export async function toggleResolved(id: string, resolved: boolean): Promise<void> {
  await requireAdmin();

  await prisma.feedback.update({
    where: { id },
    data: { resolved },
  });
  revalidatePath("/admin/feedback");
}
