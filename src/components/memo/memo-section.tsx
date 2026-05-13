import { Markdown } from "@/components/admin/markdown";

interface MemoSectionProps {
  title: string;
  body: string;
}

export function MemoSection({ title, body }: MemoSectionProps) {
  return (
    <section className="rounded-[--radius-card] border border-[--color-border] bg-[--color-bg-card] p-6">
      <h2 className="h2 mb-4">{title}</h2>
      <Markdown content={body} />
    </section>
  );
}
