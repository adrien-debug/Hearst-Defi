"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CT_PRODUCT_CONNECT_HEX } from "@/lib/cockpit-tokens";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/scenario-lab", label: "Scenario Lab" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/proof-center", label: "Proof Center" },
  { href: "/investor-memo", label: "Investor Memo" },
] as const;

export function ConnectBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hearst Connect navigation"
      className={cn("ct-hub-bar", "connect-nav")}
    >
      <span className="ct-hub-bar-label">
        <span
          className="ct-chat-ctx-dot"
          style={{ background: CT_PRODUCT_CONNECT_HEX }}
        />
        Hearst Connect
      </span>
      <div className="ct-hub-bar-track">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("ct-hub-bar-seg", active && "active")}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
