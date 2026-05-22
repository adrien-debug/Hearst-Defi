import { Markdown } from "@/components/admin/markdown";

interface MemoSectionProps {
  title: string;
  body: string;
}

export function MemoSection({ title, body }: MemoSectionProps) {
  return (
    <section className="rounded-[var(--ct-radius-lg)] border border-[var(--ct-border)] bg-[var(--ct-surface-2)] p-6">
      <h2 className="h2 mb-4">{title}</h2>
      <Markdown content={body} />
    </section>
  );
}
