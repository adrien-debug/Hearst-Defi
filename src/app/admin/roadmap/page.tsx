import { RoadmapItemRow } from "@/components/admin/roadmap-item-row";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getRoadmap } from "@/lib/roadmap";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const { version, phases } = await getRoadmap();

  const mvpPhase = phases.find((p) => p.id === "mvp");
  const mvpPct = mvpPhase
    ? Math.round((mvpPhase.doneCount / Math.max(1, mvpPhase.total)) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="eyebrow">Build progress</p>
        <div className="flex items-center gap-3">
          <h1 className="h1">Roadmap</h1>
          <Badge variant="default">v {version}</Badge>
        </div>
        <p className="body-sm max-w-2xl">
          Source of truth lives in{" "}
          <span className="mono text-[--color-text]">
            /docs/roadmap.json
          </span>{" "}
          (git-versioned). Status is persisted in Postgres / SQLite. Modifying
          the roadmap = PR on the JSON file. Marking progress = click here.
        </p>
        {mvpPhase ? (
          <Card className="max-w-md">
            <div className="flex items-center justify-between gap-3">
              <span className="stat-label">MVP progress</span>
              <span className="mono text-sm tabular text-[--color-text]">
                {mvpPhase.doneCount} / {mvpPhase.total} ({mvpPct}%)
              </span>
            </div>
            <div className="mt-3">
              <Progress value={mvpPct} />
            </div>
          </Card>
        ) : null}
      </header>

      {phases.map((phase) => (
        <section key={phase.id} className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="h2">{phase.label}</h2>
            <span className="mono text-xs text-[--color-text-dim] tabular">
              {phase.doneCount} / {phase.total}
            </span>
          </div>

          <div className="space-y-5">
            {phase.weeks.map((week) => (
              <Card key={week.id}>
                <CardHeader>
                  <div>
                    <CardTitle>{week.label}</CardTitle>
                    <div className="mt-2 flex items-center gap-2 text-xs text-[--color-text-dim]">
                      <span className="mono tabular">
                        {week.doneCount} / {week.total}
                      </span>
                      <Progress
                        value={(week.doneCount / Math.max(1, week.total)) * 100}
                        className="w-32"
                      />
                    </div>
                  </div>
                </CardHeader>

                <div className="space-y-2">
                  {week.items.map((item) => (
                    <RoadmapItemRow key={item.id} item={item} />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
