import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminIndex() {
  await requireAdmin();
  redirect("/admin/roadmap");
}
