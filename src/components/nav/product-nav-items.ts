/**
 * product-nav-items.ts
 *
 * Source de vérité pour la navigation intra-app de Hearst Connect.
 * Consommé par :
 *   - (product)/layout.tsx  → nav custom dans le rail gauche (slot .ct-rail-left-intra)
 *   - admin/layout.tsx      → rail admin (ADMIN_NAV + séparateur + ANALYTICS_NAV)
 *
 * NOTE : Le RailLeft de @hearst/cockpit-shell ne supporte PAS de prop nav
 * intra-app (API v0.1.0). La nav intra est composée dans les layouts au-dessus
 * du spacer du rail, en utilisant usePathname() côté client.
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
 * their portfolio, the vaults they can invest in, their profile, and the
 * public proof center. Operator/analyst surfaces live in the admin rail.
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
  {
    id: "profile",
    label: "Profile",
    href: "/profile",
    icon: "User",
  },
  {
    id: "proof-center",
    label: "Proof Center",
    href: "/proof-center",
    icon: "ShieldCheck",
  },
];

/**
 * Admin rail — group 1: day-to-day operations. Dashboard is the hub and the
 * first entry (the bare /admin route redirects here).
 */
export const ADMIN_NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: "LayoutDashboard",
  },
  {
    id: "vaults-admin",
    label: "Vaults",
    href: "/admin/vaults",
    icon: "Vault",
  },
  {
    id: "customers",
    label: "Customers",
    href: "/admin/customers",
    icon: "Users",
  },
  {
    id: "distributions",
    label: "Distributions",
    href: "/admin/distributions",
    icon: "FileText",
  },
  {
    id: "signals",
    label: "Rebalancing",
    href: "/admin/signals",
    icon: "Zap",
  },
  {
    id: "feedback",
    label: "Feedback",
    href: "/admin/feedback",
    icon: "MessageSquare",
  },
];

/**
 * Admin rail — group 2: analyst tools + system. Vault-wide state, not a single
 * investor's position. Rendered after a separator in the admin rail.
 */
export const ANALYTICS_NAV: NavItem[] = [
  {
    id: "scenario-lab",
    label: "Scenario Lab",
    href: "/admin/scenario-lab",
    icon: "FlaskConical",
  },
  {
    id: "projection",
    label: "Projection",
    href: "/admin/projection",
    icon: "FlaskConical",
  },
  {
    id: "proof-center",
    label: "Proof Center",
    href: "/admin/proof-center",
    icon: "ShieldCheck",
  },
  {
    id: "investor-memo",
    label: "Investor Memo",
    href: "/admin/investor-memo",
    icon: "FileText",
  },
  {
    id: "monitoring",
    label: "Monitoring",
    href: "/admin/monitoring",
    icon: "Settings2",
  },
  {
    id: "proofs",
    label: "Proofs",
    href: "/admin/proofs",
    icon: "FileCheck",
  },
  {
    id: "spec",
    label: "Spec",
    href: "/admin/spec",
    icon: "BookOpen",
  },
];
