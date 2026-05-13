"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";

function asString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function postFeedback(formData: FormData): Promise<void> {
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
  await prisma.feedback.update({
    where: { id },
    data: { resolved },
  });
  revalidatePath("/admin/feedback");
}
