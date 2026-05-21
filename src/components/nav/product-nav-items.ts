/**
 * product-nav-items.ts
 *
 * Source de vérité pour la navigation intra-app de Hearst Connect.
 * Consommé par :
 *   - (product)/layout.tsx  → nav custom dans le rail gauche (slot .ct-rail-left-intra)
 *   - BottomBar custom      → segments passés via wrapper de ProductBottomBar
 *
 * NOTE : Le RailLeft de @hearst/cockpit-shell ne supporte PAS de prop nav
 * intra-app (API v0.1.0). La nav intra est composée dans (product)/layout.tsx
 * au-dessus du spacer du rail, en utilisant usePathname() côté client.
 */

export type NavItem = {
  id: string;
  label: string;
  href: string;
  /** Nom de l'icône Lucide React (string pour éviter l'import ici — data only). */
  icon: string;
};

/**
 * Investor-facing navigation. A signed-in user only sees their own space:
 * their portfolio (positions, distributions) and the vaults they can invest
 * in. The analytics surfaces (Dashboard, Scenario Lab, Proof Center, Investor
 * Memo) are operator/analyst tools — see ANALYTICS_NAV — and are kept out of
 * the investor rail (still reachable by URL + gated by the proxy).
 */
export const PRODUCT_NAV: NavItem[] = [
  {
    id: "portfolio",
    label: "Portfolio",
    href: "/portfolio",
    icon: "Wallet",
  },
  {
    id: "vaults",
    label: "Vaults",
    href: "/vaults",
    icon: "Vault",
  },
];

/**
 * Analyst / operator tools. Surfaced inside the admin rail, not the investor
 * rail. These read vault-wide state, not a single investor's position.
 */
export const ANALYTICS_NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
  },
  {
    id: "scenario-lab",
    label: "Scenario Lab",
    href: "/scenario-lab",
    icon: "FlaskConical",
  },
  {
    id: "proof-center",
    label: "Proof Center",
    href: "/proof-center",
    icon: "ShieldCheck",
  },
  {
    id: "investor-memo",
    label: "Investor Memo",
    href: "/investor-memo",
    icon: "FileText",
  },
];

export const ADMIN_NAV: NavItem[] = [
  {
    id: "admin",
    label: "Admin",
    href: "/admin/roadmap",
    icon: "Settings2",
  },
];
