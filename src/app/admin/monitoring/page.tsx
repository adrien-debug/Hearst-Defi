import Link from "next/link";

import { getMonitoringStats } from "@/lib/data/monitoring";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const stats = await getMonitoringStats();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-4">
          <h1 className="h1">Monitoring</h1>
          <Link
            href="/admin/roadmap"
            className="text-xs font-medium text-white/40 hover:text-white transition-colors"
          >
            ← Back to admin
          </Link>
        </div>
        <p className="body-sm max-w-2xl">
          Observability dashboard for LLM runs, costs, and system health.
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Total Runs" value={stats.totalRuns.toString()} />
        <KpiCard
          title="Success Rate"
          value={`${stats.totalRuns > 0 ? Math.round((stats.successfulRuns / stats.totalRuns) * 100) : 0}%`}
        />
        <KpiCard
          title="Total Cost"
          value={`$${stats.totalCostUsd.toFixed(4)}`}
        />
        <KpiCard
          title="Avg Latency"
          value={`${stats.avgLatencyMs}ms`}
        />
      </div>

      {/* Agent Breakdown */}
      <section className="space-y-4">
        <h2 className="h2">Runs by Agent</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 font-medium text-white/60">Agent</th>
                <th className="text-right py-3 px-4 font-medium text-white/60">Runs</th>
                <th className="text-right py-3 px-4 font-medium text-white/60">Cost (USD)</th>
              </tr>
            </thead>
            <tbody>
              {stats.runsByAgent.map((row) => (
                <tr key={row.agentName} className="border-b border-white/[0.04]">
                  <td className="py-3 px-4">{row.agentName}</td>
                  <td className="py-3 px-4 text-right">{row.count}</td>
                  <td className="py-3 px-4 text-right">${row.costUsd.toFixed(4)}</td>
                </tr>
              ))}
              {stats.runsByAgent.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-white/40">
                    No runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Runs */}
      <section className="space-y-4">
        <h2 className="h2">Recent Runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 font-medium text-white/60">Agent</th>
                <th className="text-left py-3 px-4 font-medium text-white/60">Model</th>
                <th className="text-left py-3 px-4 font-medium text-white/60">Status</th>
                <th className="text-right py-3 px-4 font-medium text-white/60">Latency</th>
                <th className="text-right py-3 px-4 font-medium text-white/60">Cost</th>
                <th className="text-right py-3 px-4 font-medium text-white/60">Time</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentRuns.map((run) => (
                <tr key={run.id} className="border-b border-white/[0.04]">
                  <td className="py-3 px-4">{run.agentName}</td>
                  <td className="py-3 px-4">{run.model}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    {run.latencyMs ? `${run.latencyMs}ms` : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {run.costUsd ? `$${run.costUsd.toFixed(4)}` : "—"}
                  </td>
                  <td className="py-3 px-4 text-right text-white/40">
                    {run.createdAt.toLocaleString()}
                  </td>
                </tr>
              ))}
              {stats.recentRuns.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-white/40">
                    No runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="glass-panel p-6 relative overflow-hidden">
      <div className="relative z-10">
        <p className="text-sm text-white/50 mb-1">{title}</p>
        <p className="text-3xl font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: "bg-green-500/10 text-green-400",
    failed: "bg-red-500/10 text-red-400",
    timeout: "bg-amber-500/10 text-amber-400",
    queued: "bg-blue-500/10 text-blue-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-white/10 text-white/60"}`}
    >
      {status}
    </span>
  );
}
