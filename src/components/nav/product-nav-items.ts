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

export const PRODUCT_NAV: NavItem[] = [
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
