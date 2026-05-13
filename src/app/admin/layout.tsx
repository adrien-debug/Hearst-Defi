import Link from "next/link";

export const metadata = {
  title: "Admin — Hearst Connect",
};

const navItems = [
  { href: "/admin/roadmap", label: "Roadmap" },
  { href: "/admin/spec", label: "Spec" },
  { href: "/admin/feedback", label: "Feedback" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[--color-bg]">
      <header className="sticky top-0 z-10 border-b border-[--color-border] bg-[--color-bg]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/admin/roadmap"
            className="flex items-center gap-3 text-sm font-medium tracking-tight"
            aria-label="Hearst Connect — Admin"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/hearst-connect.svg"
              alt=""
              aria-hidden
              className="h-6 w-auto"
            />
            <span className="text-[--color-text-dim]">— Admin</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[--radius-button] px-3 py-1.5 text-sm text-[--color-text-muted] hover:bg-[--color-bg-elevated] hover:text-[--color-text]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              className="ml-2 rounded-[--radius-button] border border-[--color-border] px-3 py-1.5 text-xs text-[--color-text-dim] hover:text-[--color-text]"
            >
              ← Home
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
