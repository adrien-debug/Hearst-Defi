import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/admin/markdown";
import { cn } from "@/lib/cn";
import { getSpecDoc, getSpecIndex } from "@/lib/spec";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const entries = await getSpecIndex();
  return entries.map((entry) => ({ slug: entry.slug }));
}

export default async function SpecPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [doc, index] = await Promise.all([getSpecDoc(slug), getSpecIndex()]);
  if (!doc) {
    notFound();
  }

  return (
    <section className="ct-section grid gap-8 md:grid-cols-[220px_1fr]">
      <aside className="md:sticky md:top-24 md:self-start">
        <p className="eyebrow mb-3">Spec — v1.0</p>
        <nav className="space-y-1">
          {index.map((entry) => {
            const active = entry.slug === slug;
            return (
              <Link
                key={entry.slug}
                href={`/admin/spec/${entry.slug}`}
                className={cn(
                  "block rounded-lg px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "glass-panel-subtle"
                    : "hover:glass-panel-subtle",
                )}
                style={{
                  color: active ? "var(--ct-text-primary)" : "var(--ct-text-muted)",
                }}
              >
                <span className="mono tabular mr-2 text-xs" style={{ color: "var(--ct-text-faint)" }}>
                  {String(entry.order).padStart(2, "0")}
                </span>
                {entry.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      <article className="min-w-0">
        <p className="eyebrow mb-3">/docs/spec/{slug}.mdx</p>
        <h1 className="h1 mb-6">{doc.title}</h1>
        <Markdown content={doc.content} />
      </article>
    </section>
  );
}
