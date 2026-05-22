import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ProjectionStudio } from "./studio";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Projection Studio — Admin · Hearst Connect",
};

export default async function ProjectionPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Projection Studio" />
      <p className="body-sm max-w-2xl ct-text-muted">
        Run single or matrix projections against the deterministic engine
        (methodology v1.0). Single run or batch up to 25 cells (5×5). Promote
        a study to a vault draft when parameters are approved. All projections
        are conditional on stated assumptions and are not guaranteed.
      </p>

      <ProjectionStudio />
    </div>
  );
}
