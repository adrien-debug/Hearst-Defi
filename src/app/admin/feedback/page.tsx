import { FeedbackForm } from "@/components/admin/feedback-form";
import { FeedbackList } from "@/components/admin/feedback-list";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const items = await prisma.feedback.findMany({
    orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="eyebrow">Team channel</p>
        <h1 className="h1">Feedback</h1>
        <p className="body-sm max-w-2xl">
          Lightweight feedback channel for the team. Use this to flag anything —
          what works, what doesn&apos;t, what&apos;s confusing. Reference a
          roadmap item ID if relevant so blockers stay linked.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Post new</CardTitle>
        </CardHeader>
        <FeedbackForm />
      </Card>

      <section className="space-y-3">
        <h2 className="stat-label">Latest ({items.length})</h2>
        <FeedbackList items={items} />
      </section>
    </div>
  );
}
