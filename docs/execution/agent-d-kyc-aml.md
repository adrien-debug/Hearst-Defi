# Politique KYC / AML V1 — Hearst Yield Vault (HYV-A)

**Statut** : Active
**Effective depuis** : 2026-05-29
**Propriétaire** : Adrien (adrien@hearstcorporation.io) — Owner/Founder
**Entité** : Cayman Exempted Limited Partnership (ADR-001)
**Véhicule** : Hearst Yield Vault, vault unique HYV-A, actif USDC
**Version d'application** : couvre le sprint correctness app-code (le gel `contracts/src @ 898991c` reste intact ; aucune correction ne touche `contracts/src`)

---

## 1. Périmètre — investisseurs éligibles uniquement

L'offre HYV-A est réservée **exclusivement aux investisseurs professionnels / qualifiés**, souscrivant via la Cayman Exempted LP. Aucune commercialisation grand public, aucune sollicitation là où elle est prohibée.

| Critère d'éligibilité | Règle | Source |
|---|---|---|
| Accréditation US | SEC Rule 506(c) — net worth > $1M (hors résidence principale) **ou** revenu > $200k ($300k conjoint) sur les 2 dernières années | `AccreditationCheckboxes.tsx` (attestation `rule-506c`) |
| Reconnaissance Cayman | Cayman Islands Private Investment Fund (PIF), offre non enregistrée, réservée aux eligible investors | attestation `cayman-pif` |
| Ticket minimum Class A | $250 000 USDC, lock-up 60 jours, 1% mgmt + 10% perf HWM | ADR-008 / `SHARE_CLASS_A` |
| Ticket minimum Class B | $1 000 000 USDC, lock-up 90 jours, 0,75% mgmt + 8% perf | ADR-008 / `SHARE_CLASS_B` |
| Juridiction | Non-US, **ou** US person éligible Reg D 506(c) avec accréditation prouvée | OFAC + politique interne |

Les contrôles **lock-up (60/90 j)** et **min-ticket ($250k / $1M)** sont des contrôles **off-chain** (KYC/legal + `src/app/actions/subscribe.ts`), conformes au Model B (RR-SC-07) : le principal est custodié en cash réserve, **non déployé on-chain** ; aucune sortie owner on-chain.

---

## 2. KYC — vérification d'identité

### 2.1 Personnes physiques (individual) — Persona PROD
- Embed Persona en **environnement PRODUCTION** (le câblage sandbox actuel, template `itmplv_AmGWLdhN3movTqp6DMVVBvHQ6CDyrt`, est remplacé par un **compte + template Persona PROD**).
- Vérifications minimales : document d'identité officiel (passeport / carte nationale), liveness/selfie, vérification adresse.
- Ingestion via webhook HMAC `src/app/api/persona/webhook` → modèle `KycEvent` (`inquiryId` unique, `status`, `payload` brut, `receivedAt`).
- Sur `status = "completed"` et décision conforme → mise à jour `Investor.kycStatus = "approved"`. Sur `failed`/`expired` → `"rejected"`.

### 2.2 Personnes morales / fonds (corporate / fund) — KYB
- KYB obligatoire pour les paths `corporate` et `fund` (`OnboardingProgress.path`).
- Documents collectés et signés via **DocuSign PROD** (compte na4 ; creds prod requis : `DOCUSIGN_BASE_URL`, `DOCUSIGN_API_KEY`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_WEBHOOK_SECRET`) :
  - certificat d'incorporation / extrait de registre,
  - statuts / limited partnership agreement,
  - registre des bénéficiaires effectifs (UBO ≥ 25%),
  - liste des signataires autorisés + KYC Persona individual de chaque UBO et signataire,
  - pour un fonds : prospectus / offering memorandum + preuve de régulation.
- Suivi via `SubscriptionEnvelope` (`envelopeId` unique, `status`, `documentUrl`, `signedAt`). Webhook HMAC `src/app/api/docusign/webhook`.

---

## 3. Sanctions screening — OBLIGATOIRE avant souscription

Aucune souscription n'est activée tant que le screening sanctions n'est pas **clear**.

- Listes contrôlées : **OFAC (SDN + consolidée), UE (sanctions consolidées), ONU (Conseil de sécurité)**.
- Cibles : investisseur (personne physique/morale), tous les UBO, signataires autorisés, et l'adresse wallet de paiement (`Investor.walletAddress`).
- Résultat journalisé dans `KycEvent` (`status` = `aml-clear` / `aml-hit`, `payload` = réponse brute du fournisseur).
- Un **hit confirmé** = rejet définitif, gel de l'onboarding, aucune restitution de fonds tant que l'enquête n'est pas close.
- Re-screening périodique : tous les investisseurs actifs sont re-criblés mensuellement et à chaque distribution mensuelle USDC.

---

## 4. Travel Rule — dépôts USDC > 1 000 $

- Tout dépôt USDC d'un montant **strictement supérieur à 1 000 $** déclenche la collecte Travel Rule :
  - nom de l'originateur, identifiant de compte (adresse wallet émettrice `Investor.walletAddress`),
  - nom du bénéficiaire (Hearst Yield Vault LP), identifiant de compte bénéficiaire (vault),
  - juridiction de l'originateur.
- Données conservées avec la transaction (`InvestorTransaction`, `type = "deposit"`, `txHash`) et le `KycEvent` associé.
- Le seuil $1 000 est codé en dur côté politique ; tout dépôt sous le seuil reste soumis au screening sanctions mais sans collecte Travel Rule étendue.

---

## 5. Accréditation persistée

- Les trois attestations (`rule-506c`, `cayman-pif`, `not-guaranteed`) de `AccreditationCheckboxes.tsx` deviennent **persistées** (actuellement non persistées — GAP corrigé) :
  - ajout du champ Prisma `accreditationAttestedAt DateTime?` sur le modèle `Investor`,
  - server action écrivant `accreditationAttestedAt = now()` à la validation des 3 cases.
- Aucune souscription n'est éligible si `accreditationAttestedAt` est `null`.

---

## 6. PEP + Enhanced Due Diligence (EDD)

- Détection PEP intégrée au screening (§3) sur investisseurs, UBO, signataires.
- Un PEP identifié déclenche **EDD obligatoire** : origine des fonds documentée, source de richesse, approbation explicite par l'Owner (Adrien) avant activation du dépôt.
- Sans EDD complétée et approuvée, statut maintenu en `kycStatus = "pending"` → dépôt bloqué par le gate (§ Livrable 2).

---

## 7. Rétention & RGPD

- **Rétention 5 ans** après la fin de la relation d'affaires pour toutes les pièces KYC/KYB/AML, `KycEvent`, `SubscriptionEnvelope`, attestations d'accréditation.
- **RGPD** : chiffrement **at-rest** des données personnelles (Postgres Supabase prod chiffré au repos), accès restreint au rôle admin, droit d'accès/rectification honoré sous 30 jours, suppression à l'issue des 5 ans sauf obligation légale prolongée.
- Les `payload` Persona/DocuSign (PII brutes) ne quittent jamais la base ; aucun log applicatif ne dump de PII.

---

# Parcours d'onboarding LP — Hearst Yield Vault (HYV-A)

Chaque étape écrit son état dans `OnboardingProgress` (`userId`, `path`, `currentStep`, `data`, `completedAt`). Le dépôt n'est **jamais** activé avant que les deux conditions finales soient remplies.

## Étape 0 — Path select
- L'investisseur choisit son path : `individual` | `corporate` | `fund` → `OnboardingProgress.path`.
- `currentStep = 0`.

## Étape 1 — Accreditation (persistée)
- Affichage `AccreditationCheckboxes.tsx` : 3 attestations obligatoires (`rule-506c`, `cayman-pif`, `not-guaranteed`).
- À la validation : server action écrit `Investor.accreditationAttestedAt = now()`.
- Blocage de l'étape suivante tant que les 3 cases ne sont pas cochées et persistées.
- `currentStep = 1`.

## Étape 2 — Identity KYC (Persona PROD)
- Lancement de l'inquiry Persona PROD (individual). Pour `corporate`/`fund`, KYC individual de chaque UBO et signataire.
- Réception via webhook HMAC `src/app/api/persona/webhook` → `KycEvent`.
- `status = "completed"` + décision conforme → `Investor.kycStatus = "approved"`.
- `currentStep = 2`.

## Étape 3 — KYB docs corporate/fund (DocuSign PROD)
- **Uniquement** pour `path ∈ {corporate, fund}`. Path `individual` : étape sautée automatiquement.
- Collecte + signature des pièces KYB (cf. Politique §2.2) via DocuSign PROD.
- Suivi `SubscriptionEnvelope` (KYB docs) jusqu'à `status = "completed"` + `signedAt`.
- `currentStep = 3`.

## Étape 4 — AML / sanctions screen
- Screening OFAC / UE / ONU + détection PEP sur investisseur, UBO, signataires, wallet.
- Résultat → `KycEvent` (`status = "aml-clear"` ou `"aml-hit"`).
- PEP détecté → EDD avant de pouvoir passer `aml-clear` (cf. Politique §6).
- `currentStep = 4`.

## Étape 5 — Subscription agreement (DocuSign PROD)
- Envoi du subscription agreement (share class A ou B selon le ticket) via DocuSign PROD.
- Suivi `SubscriptionEnvelope` (`status` sent → delivered → completed, `signedAt`, `documentUrl`).
- Création de la `Subscription` (`shareClassId`, `amount`, `lockupUntil = subscribedAt + lockupDays` : 60 j Class A, 90 j Class B).
- `currentStep = 5`.

## Étape 6 — Wallet bind
- L'investisseur connecte son wallet (Privy) → `Investor.walletAddress` (unique).
- Le wallet est re-criblé sanctions avant toute activation.
- `currentStep = 6`.

## Étape 7 — Gate d'éligibilité (activation du dépôt)
Le dépôt n'est activé **que si toutes** les conditions sont vraies :
- `Investor.kycStatus === "approved"` **ET**
- dernier `KycEvent` AML pour ce `userId` = `aml-clear` (aucun `aml-hit` ouvert) **ET**
- `Investor.accreditationAttestedAt !== null` **ET**
- subscription agreement `SubscriptionEnvelope.status === "completed"` **ET**
- `Investor.walletAddress` lié et clear.

Implémentation côté code (GAP corrigé) : `src/app/actions/subscribe.ts` ajoute en tête de `subscribe()`, après résolution de l'investor :
```ts
if (investor.kycStatus !== "approved") {
  return { ok: false, error: "KYC not approved." };
}
// + vérification AML clear (dernier KycEvent aml) et accreditationAttestedAt != null
```
- `completedAt = now()` sur `OnboardingProgress` une fois le premier dépôt validé.

---

# Critères ACCEPT / REJECT — Hearst Yield Vault (HYV-A)

## Tableau de décision

| # | Dimension | ACCEPT (toutes requises) | REJECT (l'une suffit) |
|---|---|---|---|
| 1 | Accréditation | `accreditationAttestedAt != null` ; Rule 506(c) **ou** Cayman PIF eligible | Aucune attestation persistée ; non-accrédité |
| 2 | KYC identité | `Investor.kycStatus = "approved"` ; Persona PROD `completed` (+ UBO/signataires pour corp/fund) | KYC fail/expired ; docs d'identité incomplets ou non lisibles |
| 3 | KYB (corp/fund) | `SubscriptionEnvelope` KYB `completed` + UBO ≥ 25% documentés | Docs KYB incomplets ; UBO non identifiés |
| 4 | Sanctions | `KycEvent` AML = `aml-clear` (OFAC/UE/ONU, y compris wallet) | Hit sanctions confirmé (investisseur, UBO, signataire ou wallet) |
| 5 | PEP | Non-PEP **ou** PEP avec EDD complétée + approuvée par l'Owner | PEP sans EDD ; origine des fonds non justifiée |
| 6 | Juridiction | Non-US **ou** US person éligible Reg D 506(c) avec accréditation prouvée | US person **sans** Reg D / accréditation ; juridiction prohibée |
| 7 | Ticket | Class A ≥ $250 000 / Class B ≥ $1 000 000 (`resolveClassTerms`) | Ticket < minimum de la share class sélectionnée |
| 8 | Subscription agreement | `SubscriptionEnvelope` (sub agreement) `completed` + `signedAt` | Non signé ; `declined` / `voided` |
| 9 | Wallet | `walletAddress` lié, unique, clear sanctions | Wallet absent ; wallet sur liste sanctions |

## Règle de synthèse
- **ACCEPT** = lignes 1→9 toutes en colonne ACCEPT → gate (Parcours d'onboarding §7) ouvre le dépôt.
- **REJECT** = au moins une ligne en colonne REJECT → `Investor.kycStatus = "rejected"` (ou maintien `pending` si EDD en cours), dépôt bloqué par `subscribe.ts`, motif journalisé dans `KycEvent`.
- Tout REJECT pour hit sanctions (ligne 4) est **définitif** ; aucune restitution avant clôture d'enquête.

---

# Checklist conformité pilote — par investisseur (HYV-A)

Investisseur : __________________________  `userId` : __________  `Investor.id` : __________
Path : ☐ individual  ☐ corporate  ☐ fund    Share class : ☐ A ($250k / 60j)  ☐ B ($1M / 90j)

## Items binaires (cochés = conforme)

- [ ] **KYC approved** — `Investor.kycStatus === "approved"`, inquiry Persona PROD `completed` reçue sur `src/app/api/persona/webhook`
- [ ] **AML loggé & clear** — `KycEvent` AML = `aml-clear` (OFAC + UE + ONU), wallet inclus, payload brut conservé
- [ ] **Accreditation attestée + stockée** — 3 attestations validées, `Investor.accreditationAttestedAt != null`
- [ ] **Subscription signé** — `SubscriptionEnvelope` (sub agreement) `status = "completed"` + `signedAt` renseigné
- [ ] **KYB complet** (corp/fund uniquement) — `SubscriptionEnvelope` KYB `completed`, UBO ≥ 25% documentés (N/A si individual)
- [ ] **PEP** — non-PEP, **ou** PEP avec EDD complétée + approuvée par l'Owner (Adrien)
- [ ] **Travel Rule** — collecte effectuée si dépôt USDC > $1 000 (originateur + bénéficiaire + juridiction joints au `InvestorTransaction`)
- [ ] **Juridiction confirmée non-US** — non-US, **ou** US person Reg D 506(c) avec accréditation prouvée
- [ ] **Ticket conforme** — montant ≥ minimum de la share class (`resolveClassTerms` dans `subscribe.ts`)
- [ ] **Wallet bind clear** — `Investor.walletAddress` lié, unique, criblé sanctions
- [ ] **Gate appliqué** — `subscribe.ts` refuse le dépôt si `kycStatus !== "approved"` OU AML non clear OU `accreditationAttestedAt === null` (vérifié par tentative de dépôt avant approbation = refusée)
- [ ] **KycEvent retenu** — `KycEvent` (Persona + AML) conservé, rétention 5 ans, chiffrement at-rest confirmé

Décision finale : ☐ ACCEPT (12 items applicables cochés) ☐ REJECT (motif : __________)
Validé par : __________________________  Date : 2026-05-__
