"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  ShieldCheck,
  FileText,
  Settings2,
  LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";
import type { NavItem } from "./product-nav-items";
import { PRODUCT_NAV, ADMIN_NAV } from "./product-nav-items";

// ---------------------------------------------------------------------------
// Icon registry — avoids dynamic imports while keeping product-nav-items.ts
// data-only (no Lucide imports there).
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FlaskConical,
  ShieldCheck,
  FileText,
  Settings2,
};

interface Props {
  /** Override the default PRODUCT_NAV items (e.g. pass ADMIN_NAV for admin layout). */
  items?: NavItem[];
}

export function ProductRailIntra({ items = PRODUCT_NAV }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="ct-rail-intra"
      aria-label="Intra-app navigation"
      data-testid="product-rail-intra"
    >
      {items.map((item) => {
        const Icon = ICON_MAP[item.icon];
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            title={item.label}
            className={cn("ct-rail-item", isActive && "ct-rail-item-active")}
          >
            {Icon ? <Icon size={20} strokeWidth={1.8} /> : null}
            <span className="ct-rail-item-tooltip">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Convenience alias for admin layouts — uses ADMIN_NAV + PRODUCT_NAV shortcut. */
export function AdminRailIntra() {
  return <ProductRailIntra items={[...ADMIN_NAV, ...PRODUCT_NAV]} />;
}
