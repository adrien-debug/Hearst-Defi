"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import { PRODUCT_NAV } from "./product-nav-items";

// ---------------------------------------------------------------------------
// ConnectBottomBar — pilule flottante Cockpit (reproduit .ct-bottom-bar du
// template). Remplace mobile-nav.tsx + ProductBottomBar du package (qui
// n'accepte pas de prop segments externe).
//
// Positionnement : absolute dans .ct-page-area (le centre Cockpit est en
// position:relative, bottom:24px centré). Sur mobile la pilule est toujours
// visible — sur desktop elle coexiste avec le rail gauche (ils ne se chevauchent
// pas car ils sont sur des axes différents).
// ---------------------------------------------------------------------------

export function ConnectBottomBar() {
  const pathname = usePathname();

  return (
    <div className="ct-bottom-bar" data-connect-bottom-bar>
      <div className="ct-bottom-bar-inner">
        <div className="ct-seg-track">
          {PRODUCT_NAV.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn("ct-seg-btn", isActive && "active")}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
