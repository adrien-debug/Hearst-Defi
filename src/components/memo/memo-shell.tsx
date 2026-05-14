"use client";

import { useCallback, useState, useTransition } from "react";

import { generateMemoAction } from "@/app/(product)/investor-memo/actions";
import { MemoSection } from "@/components/memo/memo-section";
import { MemoToolbar } from "@/components/memo/memo-toolbar";
import type { InvestorMemoOutput } from "@/lib/agents/schemas";

interface SectionMeta {
  key: keyof InvestorMemoOutput;
  title: string;
}

const SECTIONS: ReadonlyArray<SectionMeta> = [
  { key: "executive_summary", title: "1 · Executive summary" },
  { key: "vault_structure", title: "2 · Vault structure" },
  { key: "scenario_analysis", title: "3 · Scenario analysis" },
  { key: "risk_section", title: "4 · Risk section" },
  { key: "mining_section", title: "5 · Mining section" },
  { key: "performance_section", title: "6 · Performance section" },
  { key: "methodology_note", title: "7 · Methodology note" },
  { key: "disclaimer", title: "8 · Disclaimer" },
];

function buildMarkdown(memo: InvestorMemoOutput): string {
  const generatedHeader = [
    "# Hearst Yield Vault — Investor Memo",
    "",
    `_Generated ${new Date().toISOString()}_`,
    "_Methodology v1.0_",
    "",
  ].join("\n");
  const body = SECTIONS.map(
    ({ key, title }) => `## ${title}\n\n${memo[key]}`,
  ).join("\n\n");
  return `${generatedHeader}\n${body}\n`;
}

function downloadMarkdown(memo: InvestorMemoOutput): void {
  const md = buildMarkdown(memo);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `hearst-yield-vault-memo_${stamp}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function SkeletonSection() {
  return (
    <div className="rounded-[--radius-card] border border-[--color-border] bg-[--color-bg-card] p-6">
      <div className="mb-4 h-5 w-1/3 animate-pulse rounded bg-[--color-bg-elevated]" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-[--color-bg-elevated]" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-[--color-bg-elevated]" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-[--color-bg-elevated]" />
      </div>
    </div>
  );
}

export function MemoShell() {
  const [memo, setMemo] = useState<InvestorMemoOutput | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateMemoAction();
        setMemo(result);
        setLastGeneratedAt(new Date().toISOString());
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      }
    });
  }, []);

  const handleDownload = useCallback(() => {
    if (!memo) return;
    downloadMarkdown(memo);
  }, [memo]);

  return (
    <div className="space-y-6">
      <MemoToolbar
        hasMemo={memo !== null}
        isPending={isPending}
        lastGeneratedAt={lastGeneratedAt}
        onGenerate={handleGenerate}
        onDownload={handleDownload}
      />

      {error ? (
        <div className="rounded-[--radius-button] border border-[--color-danger] bg-[--color-danger-bg] px-4 py-3">
          <p className="stat-label text-[--color-danger]">Generation failed</p>
          <p className="mt-1 font-mono text-xs text-[--color-danger] break-words">
            {error}
          </p>
        </div>
      ) : null}

      {isPending && memo === null ? (
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <SkeletonSection key={s.key} />
          ))}
        </div>
      ) : memo ? (
        <div className="space-y-4">
          {SECTIONS.map(({ key, title }) => (
            <MemoSection key={key} title={title} body={memo[key]} />
          ))}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-[--radius-card] border border-dashed border-[--color-border-subtle] text-center">
          <p className="body-sm max-w-md">
            Press{" "}
            <span className="text-[--color-text]">Generate memo</span> to produce
            the 8-section institutional memo via Claude Opus 4.7. Generation
            takes a few seconds; nothing is auto-distributed.
          </p>
        </div>
      )}
    </div>
  );
}
