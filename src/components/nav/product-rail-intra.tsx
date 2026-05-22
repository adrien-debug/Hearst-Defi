"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  FlaskConical,
  ShieldCheck,
  FileCheck,
  FileText,
  Settings2,
  Wallet,
  Vault,
  User,
  Users,
  MessageSquare,
  Zap,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";
import type { NavItem } from "./product-nav-items";
import { PRODUCT_NAV, ANALYTICS_NAV, ADMIN_NAV } from "./product-nav-items";

/** Render `false` on the server and on the first client render, then `true`
 * after hydration — so a client-only portal never causes an SSR mismatch
 * without running setState inside an effect. */
const emptySubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * Portal target lives on document.body so the rail escapes the
 * ct-panels-row stacking context (z-index:10) that would otherwise
 * paint over our fixed nav even when ct-rail-intra has z-index:1001.
 */
function useBodyPortal() {
  // Create the portal node once via lazy initial state (client-only — guard
  // against SSR where `document` is undefined). The effect only attaches /
  // detaches it from the DOM, so no setState runs inside the effect body
  // (react-hooks/set-state-in-effect) and reading it during render is safe.
  const [container] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.setAttribute("data-portal", "rail-intra");
    return el;
  });

  useEffect(() => {
    if (!container) return;
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  // Gate on hydration, not on `container`: the lazy state already has the node
  // on the first client render, but the SSR pass rendered nothing — so we must
  // also render nothing on the first client render to match, then portal.
  const hydrated = useHydrated();
  return { container, mounted: hydrated && container !== null };
}

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  FlaskConical,
  ShieldCheck,
  FileCheck,
  FileText,
  Settings2,
  Wallet,
  Vault,
  User,
  Users,
  MessageSquare,
  Zap,
  BookOpen,
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

const RAIL_STORAGE_KEY = "hc-rail-expanded";

// External store backing the rail-expanded preference. Memory is the source of
// truth (so private mode where localStorage throws still toggles), localStorage
// is persistence. Read through useSyncExternalStore so SSR/first client render
// use the default and the client reconciles without a setState-in-effect.
let railExpandedState: boolean | null = null;
const railListeners = new Set<() => void>();

function readRailExpanded(): boolean {
  if (railExpandedState !== null) return railExpandedState;
  try {
    railExpandedState = localStorage.getItem(RAIL_STORAGE_KEY) !== "0";
  } catch {
    railExpandedState = true;
  }
  return railExpandedState;
}

function writeRailExpanded(next: boolean): void {
  railExpandedState = next;
  try {
    localStorage.setItem(RAIL_STORAGE_KEY, next ? "1" : "0");
  } catch {
    // localStorage unavailable (private mode) — memory state still drives the UI.
  }
  railListeners.forEach((cb) => cb());
}

function subscribeRail(cb: () => void): () => void {
  railListeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === RAIL_STORAGE_KEY) {
      railExpandedState = null; // invalidate cache, re-read on next snapshot
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    railListeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Collapsible rail state. Default expanded (labels shown). Persisted in
 * localStorage and reflected onto <html data-rail-mode> so the shell's reserved
 * column (.ct-rail-left) can widen in lockstep and push the content, instead of
 * the rail overlaying it.
 */
function useRailExpanded(): { expanded: boolean; toggle: () => void } {
  // Default expanded on the server + first client render; the store reconciles
  // to the persisted value on the client (no setState-in-effect).
  const expanded = useSyncExternalStore(subscribeRail, readRailExpanded, () => true);

  useEffect(() => {
    document.documentElement.dataset.railMode = expanded ? "expanded" : "collapsed";
  }, [expanded]);

  const toggle = useCallback(() => {
    writeRailExpanded(!readRailExpanded());
  }, []);

  return { expanded, toggle };
}

function RailToggle({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = expanded ? PanelLeftClose : PanelLeftOpen;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
      aria-expanded={expanded}
      title={expanded ? "Collapse" : "Expand"}
      className="ct-rail-item ct-rail-toggle"
    >
      <Icon size={20} strokeWidth={1.8} />
      <span className="ct-rail-item-tooltip">
        {expanded ? "Collapse" : "Expand"}
      </span>
    </button>
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
  const { expanded, toggle } = useRailExpanded();

  const adminEntry = ADMIN_NAV.find((item) => item.id === "dashboard");

  const nav = (
    <nav
      className="ct-rail-intra"
      aria-label="Investor navigation"
      data-testid="investor-rail-intra"
      data-rail="investor"
    >
      <RailToggle expanded={expanded} onToggle={toggle} />
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
  const { expanded, toggle } = useRailExpanded();

  const nav = (
    <nav
      className="ct-rail-intra"
      aria-label="Admin navigation"
      data-testid="admin-rail-intra"
    >
      <RailToggle expanded={expanded} onToggle={toggle} />
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
