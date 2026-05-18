// All product routes require auth data and live vault state — disable static prerendering.
export const dynamic = "force-dynamic";

import Link from "next/link";

import { LoginButton } from "@/components/auth/login-button";
import { MobileNav } from "@/components/navigation/mobile-nav";
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
    <div className="min-h-dvh relative overflow-hidden selection:bg-white/20 selection:text-white">
      {/* Ambient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white/[0.03] blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[50%] rounded-full bg-blue-500/[0.02] blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[40%] rounded-full bg-purple-500/[0.02] blur-[120px]" />
      </div>

      <header className="sticky top-6 z-50 mx-auto max-w-fit px-4">
        <div className="glass-panel rounded-[32px] px-4 md:px-6 py-3 flex items-center gap-4 md:gap-8 shadow-2xl shadow-black/50 border-white/10 bg-black/40 backdrop-blur-2xl">
          <Link href="/dashboard" aria-label="Hearst Connect — Dashboard" className="flex items-center gap-2 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/hearst-connect.svg"
              alt=""
              aria-hidden
              className="h-6 w-auto opacity-90 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-full border border-white/[0.05]">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium transition-all duration-300",
                  "text-white/60 hover:text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4 pl-2 border-l border-white/10">
            <Link
              href="/admin/roadmap"
              className="hidden md:inline text-xs font-medium text-white/40 hover:text-white transition-colors"
            >
              Admin
            </Link>
            <div className="scale-90 origin-right">
              <LoginButton />
            </div>
            <MobileNav />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-screen-2xl px-4 md:px-8 py-12 md:py-16 mt-4">
        {children}
      </main>
    </div>
  );
}
