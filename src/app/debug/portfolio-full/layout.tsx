import type { ReactNode } from "react";

import { ChatToolbarDebug } from "./_components/chat-toolbar-debug";
import { InvestorRailDebug } from "./_components/investor-rail-debug";

/**
 * Layout local au clone debug.
 *
 * Le shell racine (`AppChrome` → `ConnectShell` du package `@hearst/cockpit-shell`)
 * fournit déjà le frame visuel global (rail-left vide, page-area, chat Kimi
 * à droite). Ce layout y monte EN PLUS :
 *
 *   - InvestorRailDebug : le rail gauche (fork simplifié, portalisé).
 *   - ChatToolbarDebug : la toolbar Conversation/Review au-dessus du chat
 *     (fork sans gate admin, toujours visible).
 *
 * Modifier ces deux fichiers ne touche QUE cette URL.
 *
 * Note : le rail prod (`InvestorRailIntra`) vit dans `(product)/layout.tsx`,
 * lui-même protégé par `requireInvestor` ; il n'est PAS chargé ici, donc pas
 * de double rail visible.
 */
export default function PortfolioFullDebugLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <InvestorRailDebug />
      <ChatToolbarDebug />
      {children}
    </>
  );
}
