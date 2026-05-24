"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Wallet, Vault, User, ShieldCheck, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * FORK simplifié de `InvestorRailIntra`.
 *
 * Différences avec la prod :
 *  - Pas de localStorage / store externe (toujours en mode "expanded").
 *  - Pas de toggle collapse/expand.
 *  - Pas de gestion admin (entrée "Admin" absente).
 *  - Toujours actif sur Portfolio (puisque c'est la seule page debug).
 *  - Portalisé vers document.body pour échapper au stacking context du shell
 *    (comme la prod).
 *
 * Les classes `ct-rail-*` viennent du package `@hearst/cockpit-shell` (CSS
 * global déjà chargé via ConnectShell racine). Modifier le LOOK du rail
 * directement → changer les classes ici, ou ajouter du CSS dans
 * `_styles/portfolio.css`.
 */

type RailEntry = {
  id: string;
  label: string;
  href: string;
  Icon: LucideIcon;
};

const DEBUG_RAIL: RailEntry[] = [
  { id: "portfolio", label: "Portfolio", href: "/debug/portfolio-full", Icon: Wallet },
  { id: "vaults", label: "Vaults", href: "#vaults", Icon: Vault },
  { id: "profile", label: "Profile", href: "#profile", Icon: User },
  { id: "proof", label: "Proof Center", href: "#proof", Icon: ShieldCheck },
];

export function InvestorRailDebug() {
  const [portalEl] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.setAttribute("data-portal", "rail-debug");
    return el;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!portalEl) return;
    document.body.appendChild(portalEl);
    // Portal hydration signal — needs a re-render after the DOM node is
    // appended so the createPortal child mounts. Intentional set-state in
    // effect (the alternative useSyncExternalStore is overkill for a debug
    // page).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => {
      document.body.removeChild(portalEl);
    };
  }, [portalEl]);

  if (!mounted || !portalEl) return null;

  return createPortal(
    <nav
      className="ct-rail-intra"
      aria-label="Investor navigation (debug clone)"
      data-rail="investor-debug"
    >
      {DEBUG_RAIL.map((item) => {
        const Icon = item.Icon;
        const isActive = item.id === "portfolio";
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            title={item.label}
            className={cn("ct-rail-item", isActive && "ct-rail-item-active")}
          >
            <Icon size={20} strokeWidth={1.8} />
            <span className="ct-rail-item-tooltip">{item.label}</span>
          </Link>
        );
      })}
    </nav>,
    portalEl,
  );
}
