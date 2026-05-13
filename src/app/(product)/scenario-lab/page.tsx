import { LabShell } from "@/components/scenario/lab-shell";

export default function ScenarioLabPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="eyebrow">Hearst Yield Vault</p>
        <h1 className="h1">Scenario Lab</h1>
        <p className="body-sm max-w-2xl">
          Rule-based projections across 5 market scenarios. Adjust inputs or
          select a preset — outputs are deterministic, conditional on stated
          assumptions. Not guaranteed.
        </p>
      </header>

      <LabShell />
    </div>
  );
}
