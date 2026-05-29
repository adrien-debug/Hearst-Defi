# Sprint Correctness — Package de lancement Hearst (corrections app-code)

**Gel contrat :** `898991c` (`feat(vaults): dépôt ERC-4626 réel via viem + fallback gracieux (B3)`).
**Garantie absolue :** aucune correction de ce sprint ne touche `contracts/src`. `git diff 898991c HEAD -- contracts/src` retourne une sortie vide (EXIT 0, vérifié au Lot 0 et re-vérifié au Lot 5). Toutes les modifs vivent dans `src/`, `prisma/`, `next.config.ts`, `.github/workflows/`, `package.json`.

---

## Livrable 1 — Liste exhaustive des corrections app-code autorisées

Garantie commune vérifiable : `git diff 898991c HEAD -- contracts/src` reste **vide** après chaque lot (gel contrat 898991c intact ; OZ v5.6.1 @5fd1781 ; Safe 3/5 + timelock 48 h + guardian séparé inchangés).

| ID | Description | Fichier(s):ligne(s) exactes | Type | Touche `contracts/src` ? |
|----|-------------|------------------------------|------|--------------------------|
| **C-01** | Gate KYC sur le dépôt : refuser la souscription si `investor.kycStatus !== "approved"`. Lire `kycStatus` via `prisma.investor` (le `getInvestor()` ne le sélectionne pas) et retourner `{ ok: false, error: "KYC approval required before subscribing." }`. | `src/app/actions/subscribe.ts:46-49` (juste après `getInvestor()`, avant le contrôle montant l.51) ; modèle source `prisma/schema.prisma:345` (`kycStatus @default("pending")`) | logique serveur | NON |
| **C-02** | Alias env vault : le code lit `NEXT_PUBLIC_HEARST_VAULT_ADDRESS`, l'env expose `NEXT_PUBLIC_HEARST_YIELD_VAULT_ADDRESS`. Faire lire les deux avec priorité au nom canonique : `process.env.NEXT_PUBLIC_HEARST_YIELD_VAULT_ADDRESS ?? process.env.NEXT_PUBLIC_HEARST_VAULT_ADDRESS`. | `src/lib/onchain/vault.ts:41` (IIFE `VAULT_ADDRESS`) ; messages `ConfigError` l.221-224 et l.279-282 à mettre à jour avec le nom canonique | config | NON |
| **C-03** | Share class réelle dans les widgets portfolio : `loadLockMeterProps` renvoie `softLockupDays:0` / `earlyExitPenaltyBps:0` codés en dur (l.314-320) au lieu de lire la share class de la position. Dériver le code de classe depuis `position.vaultKey` (suffixe `:class-A`/`:class-B` écrit par `subscribe.ts:97`) puis lire `SHARE_CLASS_A`/`SHARE_CLASS_B.softLockupDays` (60/90). De même la cadence `defaultCadence = "monthly, T+5"` codée l.387 doit dériver de la classe. | `src/lib/data/portfolio.ts:310-320` (LockMeter) et `:386-388` (DistribCalendar) ; source de vérité `src/lib/engine/share-class.ts:22-38` | logique serveur | NON |
| **C-04** | Fees réconciliés : l'engine `SHARE_CLASS_A` est déjà correct (`mgmtFeeBps=100`, `perfFeeBps=1000`) ; le défaut Prisma `VaultDeployment.mgmtFeeBps @default(200)` (2 %) contredit la spec 1 %. Aligner le défaut à `100`. `perfFeeBps @default(1000)` et `hurdleBps @default(0)` sont déjà bons et ne changent pas. | `prisma/schema.prisma:405` (`mgmtFeeBps Int @default(200)` → `@default(100)`) ; cohérence avec `src/lib/engine/share-class.ts:26` | migration Prisma | NON |
| **C-05** | Tax preview fabriqué : `getTaxPreview` génère `interestIncomeUsd = round2(12_000 + userSeed*100)` et `principalUsd = 250_000 + userSeed*1_000` (valeurs inventées). Désactiver le bouton/onglet "Tax Docs Preview" tant que la donnée n'est pas réelle : passer le trigger l.243-259 à `disabled` + tooltip "Available 2027 Q1", aligné sur les boutons download déjà `disabled` (l.374-377). | Bouton trigger `src/components/portfolio/tax-docs-drawer.tsx:243-259` ; stub source `src/lib/portfolio/tax.ts:187-211` | UI | NON |
| **C-06** | APY literal PDF : `9.4–12.8%` est codé en dur dans le résumé (l.458) et la note de bas (l.613). Lire le range depuis `p.vaultDeployment?.targetApyLowBps/HighBps` (déjà disponible : fallbacks `?? 940` / `?? 1280` calculés l.727-728) et formater `${(low/100).toFixed(1)}–${(high/100).toFixed(1)}%`. | `src/app/api/statements/[id]/pdf/route.tsx:458` et `:613` ; source bps déjà présente `:727-728` | logique serveur | NON |
| **C-07** | Règle Model B dans l'agent investor-memo : ajouter à `buildSystemInstructions` la règle « principal is held in a USDC cash reserve inside the vault, not deployed on-chain; yield is a mining-revenue-share distribution injected monthly ». | `src/lib/agents/investor-memo.ts:82-105` (corps de `buildSystemInstructions`, dans le bloc de règles avant la liste des sections) | logique serveur (prompt) | NON |
| **C-08** | Persistance de l'accréditation : ajouter `accreditationAttestedAt DateTime?` au modèle `Investor`, persister via une server action appelée par `AccreditationCheckboxes.onContinue` (les 3 cases sont gérées en `useState` l.43 et jamais envoyées au serveur). | `prisma/schema.prisma:339-353` (ajout champ `accreditationAttestedAt DateTime?` au modèle `Investor`) ; nouveau handler appelant une server action depuis `src/components/onboarding/AccreditationCheckboxes.tsx:36,43-45` | migration Prisma + logique serveur | NON |
| **C-09** | MFA TOTP admin : `otpauth@^9.5.1` + `qrcode@^1.5.4` + `@types/qrcode` sont en deps (`package.json:142,145,176`) mais non câblés. Câbler l'enrôlement (génération secret + QR `qrcode`) et la vérification (`otpauth.TOTP.validate`) sur le flux de connexion admin, persister le secret chiffré côté `User`. | `package.json:142,145` (deps présentes) ; câblage côté flux admin (`src/app/admin/*` + `src/lib/auth/session.ts`) | logique serveur | NON |
| **C-10** | Durcissement CSP `connect-src` : `connect-src 'self' https: wss:` est un wildcard. Le resserrer aux origines réellement appelées : `'self' https://auth.privy.io https://telemetry.privy.io https://sepolia.base.org wss://auth.privy.io` (+ `NEXT_PUBLIC_CHAIN_RPC_URL` si défini). | `next.config.ts:156` (entrée `connect-src` du tableau CSP l.150-161) | config | NON |
| **C-11** | Cookie de session `sameSite "lax" → "strict"` : durcir le cookie `hc_session`. Mettre à jour aussi la mention dans la page de confidentialité (qui dit `sameSite=lax`). | `src/lib/auth/session.ts:131` (`sameSite: "lax"` → `"strict"`) ; texte `src/app/legal/privacy/page.tsx:97` | config | NON |
| **C-12** | Flow reset password : implémenter l'envoi du lien de réinitialisation via Resend (`RESEND_API_KEY` disponible), token à usage unique expirant, route + server action de validation. | nouveau flux sous `src/app/` + `src/lib/auth/`, utilisant `RESEND_API_KEY` (env, jamais hardcodée) | logique serveur | NON |
| **C-13** | Model B one-liner sur la surface LP : afficher « Principal held in a USDC cash reserve — not deployed on-chain; yield is a monthly mining-revenue-share distribution » sur le term-sheet / vault detail LP. | composant vault detail / term-sheet sous `src/app/` ou `src/components/` (surface LP) | UI | NON |
| **C-14** | Playwright E2E bloquant en CI : le job `playwright` est en `continue-on-error: true` (n'échoue jamais la CI). Passer à `continue-on-error: false`. | `.github/workflows/ci.yml:110` | CI | NON |

---

## Livrable 2 — Priorisation

**P0 — bloquant pilote (correctness investisseur / conformité légale, doit shipper avant le moindre LP réel)**
- **C-01** Gate KYC — un dépôt sans KYC approuvé est une faille de conformité Rule 506(c)/PIF directe.
- **C-02** Alias env vault — sans l'alias, toute transaction on-chain lève `ConfigError` et le dépôt casse silencieusement en prod.
- **C-04** Fees défaut Prisma 2 %→1 % — un défaut faux facture 2× la spec et contredit l'engine déjà correct.
- **C-05** Tax preview off — afficher des chiffres fiscaux inventés (`12_000 + userSeed*100`) à un LP qualifié est un risque légal majeur.
- **C-06** APY bps PDF — le range codé en dur viole le non-négociable #1 (APY toujours range lu depuis la donnée vault) sur un document signé.
- **C-08** Persistance accréditation — sans trace horodatée de l'attestation, la preuve d'éligibilité légale n'existe pas.
- **C-13** Model B one-liner LP — l'absence de cette mention laisse croire à un déploiement on-chain du principal (mauvaise représentation produit). Rappel produit : le principal est détenu en réserve cash USDC dans le vault, **non déployé on-chain**.

**P1 — durcissement (post-pilote immédiat, pas un bloqueur d'ouverture mais à fermer vite)**
- **C-03** Share class réelle widgets — un LP Class B voit lock 60 j au lieu de 90 j (donnée fausse, non bloquante pour le dépôt lui-même).
- **C-07** Règle Model B agent memo — empêche le mémo généré d'affirmer un déploiement on-chain du principal.
- **C-09** MFA TOTP admin — élève la sécurité du panneau admin ; deps déjà payées, câblage seul restant.
- **C-10** CSP `connect-src` resserré — réduit la surface d'exfiltration ; attendu par l'audit sécu.
- **C-11** Cookie `sameSite strict` — durcit le CSRF ; vérifier que le flow Privy (popup) survit au `strict`.
- **C-12** Reset password Resend — complète le flux auth ; Resend déjà dispo.

**CI — garde-fou d'intégration (à activer en dernier, une fois P0/P1 verts)**
- **C-14** Playwright bloquant — transforme l'E2E en filet anti-régression réel ; à passer bloquant seulement après que la suite E2E soit verte localement, sinon la CI casse sur du legacy.

---

## Livrable 3 — Ordre d'exécution (dépendance-aware)

Schéma de dépendance : migrations Prisma d'abord (C-04, C-08 modifient le schéma), puis logique serveur qui consomme ces champs, puis UI, puis config sécu, puis CI en dernier (gate global).

**Lot 0 — Pré-vol gel contrat (avant toute modif)**
```bash
git diff 898991c HEAD -- contracts/src    # DOIT être vide (gel contrat 898991c intact)
pnpm typecheck && pnpm lint && pnpm test  # baseline verte avant de commencer
```

**Lot 1 — Migrations Prisma (C-04, C-08)**
1. C-04 : `mgmtFeeBps @default(200)` → `@default(100)` dans `VaultDeployment`.
2. C-08 : ajout `accreditationAttestedAt DateTime?` au modèle `Investor`.
```bash
pnpm db:migrate   # crée + applique la migration nommée : fees_default_1pct_accred_attest
pnpm db:generate  # régénère le client Prisma typé
pnpm typecheck    # 0 erreur : les nouveaux champs typés sont reconnus
```

**Lot 2 — Logique serveur (C-02, C-01, C-08 server action, C-06, C-07, C-12, C-09)**
3. C-02 : alias env dans `vault.ts:41` (+ messages `ConfigError` l.221-224, l.279-282).
4. C-01 : gate KYC dans `subscribe.ts:46-49` (lit `kycStatus` via Prisma).
5. C-08 (serveur) : server action `attestAccreditation` écrivant `accreditationAttestedAt`.
6. C-06 : APY range lu depuis `targetApyLowBps/HighBps` dans le PDF (l.458, 613).
7. C-07 : règle Model B dans `buildSystemInstructions` (investor-memo).
8. C-12 : flow reset password Resend.
9. C-09 : câblage MFA TOTP admin (otpauth + qrcode).
```bash
pnpm typecheck && pnpm lint && pnpm test
```

**Lot 3 — UI (C-03, C-05, C-08 wiring, C-13)**
10. C-03 : `loadLockMeterProps` / cadence lisent la vraie share class.
11. C-05 : bouton "Tax Docs Preview" `disabled` (tax-docs-drawer:243-259).
12. C-08 (UI) : `AccreditationCheckboxes.onContinue` appelle la server action.
13. C-13 : Model B one-liner sur la surface LP.
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

**Lot 4 — Config sécu (C-10, C-11)**
14. C-10 : `connect-src` resserré (`next.config.ts:156`).
15. C-11 : `sameSite: "strict"` (session.ts:131) + texte privacy l.97.
```bash
pnpm build   # valide le header CSP au build ; smoke-test login Privy en strict
```

**Lot 5 — CI bloquant (C-14, en dernier)**
16. C-14 : `continue-on-error: true` → `false` (ci.yml:110).
```bash
pnpm test:e2e                             # DOIT être vert localement AVANT de rendre le job bloquant
git diff 898991c HEAD -- contracts/src    # re-vérif finale : vide (EXIT 0)
```

---

## Livrable 4 — Critères de validation

### Par correction (test ajouté / comportement attendu)

| ID | Critère de validation |
|----|------------------------|
| **C-01** | Test Vitest sur `subscribe()` : investor `kycStatus="pending"` → `{ ok:false, error:"KYC approval required before subscribing." }` ; `kycStatus="approved"` → position créée. Test `rejected` → bloqué. |
| **C-02** | Test : avec `NEXT_PUBLIC_HEARST_YIELD_VAULT_ADDRESS` défini et `NEXT_PUBLIC_HEARST_VAULT_ADDRESS` absent, `VAULT_ADDRESS` est résolu (non `null`) ; format `0x…40hex` validé ; un nom seul (l'un ou l'autre) suffit. |
| **C-03** | Test : position `vaultKey` se terminant par `:class-B` → `softLockupDays === 90` ; `:class-A` → `60`. Cadence DistribCalendar dérivée de la classe, jamais "monthly, T+5" codé en dur pour B. |
| **C-04** | Test/assertion schéma : `VaultDeployment.mgmtFeeBps` défaut = `100`. Cohérence : `SHARE_CLASS_A.mgmtFeeBps === 100` et `perfFeeBps === 1000` (1 % + 10 %), `SHARE_CLASS_B` `75`/`800` (0,75 % + 8 %) inchangés. |
| **C-05** | Test composant : le trigger "Tax Docs Preview" rend `disabled` ; aucun rendu n'affiche `12_000 + …`. Snapshot : boutons download restent `disabled`. |
| **C-06** | Test : PDF route avec `targetApyLowBps=940/HighBps=1280` → sortie `"9.4–12.8%"` ; avec `800/1500` → `"8.0–15.0%"`. Aucune occurrence du literal `9.4–12.8%` en dur restante (`grep` à zéro hors fallback chiffré). |
| **C-07** | Test agent : `buildSystemInstructions(...)` contient la chaîne « cash reserve » + « not deployed on-chain » + « mining-revenue-share » ; linter forbidden-words toujours vert (pas de "guarantee/promise/certain/will deliver/risk-free"). |
| **C-08** | Test : la server action écrit `accreditationAttestedAt` (non-null) une fois les 3 cases cochées ; absence de coche → champ reste `null` et `Continue` désactivé (`allChecked` l.45). |
| **C-09** | Test : `otpauth.TOTP.validate` accepte un code valide, rejette un code expiré ; enrôlement produit un QR via `qrcode` ; secret persisté chiffré, jamais en clair. |
| **C-10** | Assertion build : header `Content-Security-Policy` ne contient plus `connect-src 'self' https: wss:` ; contient les origines Privy + RPC Base Sepolia explicites. |
| **C-11** | Assertion : cookie `hc_session` émis avec `SameSite=Strict` ; login Privy fonctionne encore (smoke-test). Texte privacy mis à jour ("strict"). |
| **C-12** | Test E2E : demande de reset → email Resend déclenché → token usage-unique → mot de passe changé → token invalidé (rejet à la 2ᵉ utilisation). |
| **C-13** | Test composant/E2E : la surface LP (term-sheet / vault detail) affiche le one-liner Model B exact (« Principal held in a USDC cash reserve — not deployed on-chain; yield is a monthly mining-revenue-share distribution »). |
| **C-14** | CI : un E2E rouge fait échouer le pipeline (job `playwright` `continue-on-error: false`). |

### Invariants globaux NON négociables (toute la PR, gate de merge)

```bash
pnpm typecheck    # → 0 erreur
pnpm lint         # → 0 erreur (no-any, no as-unknown-as, server-only respectés)
pnpm test         # → vitest run : suite 100 % verte
pnpm build        # → build prod OK (CSP/headers inclus)
pnpm test:e2e     # → Playwright vert (prérequis à C-14 bloquant)

# GEL CONTRAT — invariant absolu, doit retourner une sortie VIDE :
git diff 898991c HEAD -- contracts/src
```

- `git diff 898991c HEAD -- contracts/src` **doit être vide** (gel contrat 898991c intact ; OZ v5.6.1 @5fd1781, solc 0.8.24 / optimizer 200 / cancun / via_ir=false inchangés). Vérifié au Lot 0 et re-vérifié au Lot 5 — confirmé vide (`EXIT 0`, aucune ligne).
- Gouvernance on-chain inchangée : Safe 3/5 + timelock 48 h + guardian séparé, vault ERC-4626 sur Base Sepolia avec USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e` et `minDeposit = 250000000000` (250 000 USDC, 6 décimales ; ticket min $250k, plafond $1M). Aucune correction de ce sprint ne reconfigure ces paramètres.
- Aucune modif sous `contracts/` : `forge` reste à **73/73** verts (gouvernance parity hash `0xe13ea3a1e2109dd41ea773534291e0672cfdb9c44dfafc023132149975a9a036` non recalculé). Le redéploiement du vault testnet (`0xEc733c6dbD69F862489a9Da01338aA5D39C1F60d` → nouvelle adresse avec guardian) est **hors scope app-code** et ne fait pas partie de ce sprint.
- Modèle produit ancré : **Model B** — le principal est détenu en réserve cash USDC dans le vault, **non déployé on-chain** ; le rendement est une distribution mensuelle de partage de revenu minier. C-07 (agent) et C-13 (surface LP) gravent cette vérité dans les sorties générées et l'UI.
- Non-négociables CLAUDE.md préservés : #1 APY toujours range (C-06), #4 agents JSON structuré only (C-07 n'ajoute qu'une règle système), #5 forbidden-words vert (C-07), #6 pureté engine (`share-class.ts` non modifié, seul le défaut Prisma C-04 bouge), aucun `any` / `as unknown as` introduit.

Fichiers sourcés (chemins absolus) : `/Users/adrienbeyondcrypto/Dev/Hearst Corporation/connect — Hearst Defi/src/app/actions/subscribe.ts`, `…/src/lib/onchain/vault.ts`, `…/src/lib/data/portfolio.ts`, `…/src/lib/engine/share-class.ts`, `…/prisma/schema.prisma`, `…/src/app/api/statements/[id]/pdf/route.tsx`, `…/src/lib/portfolio/tax.ts`, `…/src/components/portfolio/tax-docs-drawer.tsx`, `…/src/lib/agents/investor-memo.ts`, `…/src/components/onboarding/AccreditationCheckboxes.tsx`, `…/next.config.ts`, `…/src/lib/auth/session.ts`, `…/src/app/legal/privacy/page.tsx`, `…/package.json`, `…/.github/workflows/ci.yml`.
