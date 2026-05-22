import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LabShell } from "@/components/scenario/lab-shell";

export default function ScenarioLabPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader title="Scenario Lab" />
      <p className="body-sm max-w-2xl">
        Rule-based projections across 5 market scenarios. Adjust inputs or
        select a preset — outputs are deterministic, conditional on stated
        assumptions. Not guaranteed.
      </p>

      <LabShell />
    </div>
  );
}
