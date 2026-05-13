import Link from "next/link";

import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scenario-lab", label: "Scenario Lab" },
  { href: "/proof-center", label: "Proof Center" },
  { href: "/investor-memo", label: "Investor Memo" },
] as const;

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[--color-bg]">
      <header className="sticky top-0 z-10 border-b border-[--color-border-subtle] bg-[--color-bg]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" aria-label="Hearst Connect — Dashboard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/hearst-connect.svg"
              alt=""
              aria-hidden
              className="h-7 w-auto"
            />
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-[--radius-button] px-3 py-1.5 text-sm transition-colors",
                  "text-[--color-text-muted] hover:bg-[--color-bg-elevated] hover:text-[--color-text]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/admin/roadmap"
            className="text-xs text-[--color-text-dim] hover:text-[--color-text]"
          >
            Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
