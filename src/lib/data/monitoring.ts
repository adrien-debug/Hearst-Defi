import "server-only";

import { prisma } from "@/lib/db";

export interface MonitoringStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  runsByAgent: Array<{ agentName: string; count: number; costUsd: number }>;
  recentRuns: Array<{
    id: string;
    agentName: string;
    model: string;
    status: string;
    latencyMs: number | null;
    costUsd: number | null;
    createdAt: Date;
  }>;
}

export async function getMonitoringStats(): Promise<MonitoringStats> {
  const [
    totalRuns,
    successfulRuns,
    failedRuns,
    totalCost,
    avgLatency,
    runsByAgent,
    recentRuns,
  ] = await Promise.all([
    prisma.llmRun.count(),
    prisma.llmRun.count({ where: { status: "success" } }),
    prisma.llmRun.count({ where: { status: { in: ["failed", "timeout"] } } }),
    prisma.llmRun.aggregate({ _sum: { costUsd: true } }),
    prisma.llmRun.aggregate({ _avg: { latencyMs: true } }),
    prisma.llmRun.groupBy({
      by: ["agentName"],
      _count: { agentName: true },
      _sum: { costUsd: true },
    }),
    prisma.llmRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        agentName: true,
        model: true,
        status: true,
        latencyMs: true,
        costUsd: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    totalRuns,
    successfulRuns,
    failedRuns,
    totalCostUsd: totalCost._sum.costUsd ?? 0,
    avgLatencyMs: Math.round(avgLatency._avg.latencyMs ?? 0),
    runsByAgent: runsByAgent.map((r) => ({
      agentName: r.agentName,
      count: r._count.agentName,
      costUsd: r._sum.costUsd ?? 0,
    })),
    recentRuns,
  };
}
