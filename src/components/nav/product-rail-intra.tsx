"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  FlaskConical,
  ShieldCheck,
  FileText,
  Settings2,
  Wallet,
  Vault,
  User,
  Users,
  LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";
import type { NavItem } from "./product-nav-items";
import { PRODUCT_NAV, ANALYTICS_NAV, ADMIN_NAV } from "./product-nav-items";

/**
 * Portal target lives on document.body so the rail escapes the
 * ct-panels-row stacking context (z-index:10) that would otherwise
 * paint over our fixed nav even when ct-rail-intra has z-index:1001.
 */
function useBodyPortal() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-portal", "rail-intra");
    document.body.appendChild(el);
    containerRef.current = el;
    setMounted(true);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  return { container: containerRef.current, mounted };
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FlaskConical,
  ShieldCheck,
  FileText,
  Settings2,
  Wallet,
  Vault,
  User,
  Users,
};

// Thin horizontal rule between nav sections.
function RailSeparator() {
  return (
    <hr
      aria-hidden="true"
      className="ct-rail-sep"
    />
  );
}

interface RailItemProps {
  item: NavItem;
  pathname: string;
}

function RailItem({ item, pathname }: RailItemProps) {
  const Icon = ICON_MAP[item.icon];
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <Link
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
}

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
      {items.map((item) => (
        <RailItem key={item.id} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

/**
 * Full investor rail — Portfolio / Vaults / Profile.
 * When `isAdmin` is true, a separator + "Admin" entry are appended so an admin
 * reviewing the product surfaces can jump back to their zone.
 * Portals to document.body to escape ct-panels-row stacking context.
 */
export function InvestorRailIntra({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const { container, mounted } = useBodyPortal();

  const adminEntry = ADMIN_NAV.find((item) => item.id === "admin");

  const nav = (
    <nav
      className="ct-rail-intra"
      aria-label="Investor navigation"
      data-testid="investor-rail-intra"
    >
      {PRODUCT_NAV.map((item) => (
        <RailItem key={item.id} item={item} pathname={pathname} />
      ))}
      {isAdmin && adminEntry ? (
        <>
          <RailSeparator />
          <RailItem item={adminEntry} pathname={pathname} />
        </>
      ) : null}
    </nav>
  );

  if (!mounted || !container) return null;
  return createPortal(nav, container);
}

/**
 * Admin/operator rail — Admin + Customers / separator / analyst tools.
 * Watertight: never shown to investors.
 * Portals to document.body to escape ct-panels-row stacking context.
 */
export function AdminRailIntra() {
  const pathname = usePathname();
  const { container, mounted } = useBodyPortal();

  const nav = (
    <nav
      className="ct-rail-intra"
      aria-label="Admin navigation"
      data-testid="admin-rail-intra"
    >
      {ADMIN_NAV.map((item) => (
        <RailItem key={item.id} item={item} pathname={pathname} />
      ))}
      <RailSeparator />
      {ANALYTICS_NAV.map((item) => (
        <RailItem key={item.id} item={item} pathname={pathname} />
      ))}
    </nav>
  );

  if (!mounted || !container) return null;
  return createPortal(nav, container);
}
