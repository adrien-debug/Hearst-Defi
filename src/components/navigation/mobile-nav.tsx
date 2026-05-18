"use client";

import { useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scenario-lab", label: "Scenario Lab" },
  { href: "/proof-center", label: "Proof Center" },
  { href: "/investor-memo", label: "Investor Memo" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <nav
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-white/[0.06] bg-black/90 backdrop-blur-2xl p-4 shadow-2xl"
          role="menu"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                "text-white/60 hover:text-white hover:bg-white/10",
              )}
              role="menuitem"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-white/[0.06] pt-2">
            <Link
              href="/admin/roadmap"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-white/40 hover:text-white transition-colors"
              role="menuitem"
            >
              Admin
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
