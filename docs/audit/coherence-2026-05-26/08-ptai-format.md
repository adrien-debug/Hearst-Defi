# Audit PTAI Format — 2026-05-26

> Règle CLAUDE.md §3 : **PTAI format mandatory** for simulations and rebalancing actions: Projection → Trigger → Action → Impact.
> Spec source : `/docs/spec/07-rebalancing-rules.mdx` §40 — « This pattern is enforced by the `<Ptai>` component in UI ».

Auditeur : read-only. Aucune modification de code.

---

## Résumé exécutif

Le composant primitif `<Ptai>` est sain (cf. `src/components/ui/ptai.tsx`) : ordre P → T → A → I codé en dur dans `ROWS`, 4 props **toutes requises**, mapping de tokens explicite. Le schéma Prisma `RebalanceEvent` stocke bien `projection / triggerText / actionText / impactText`. La règle est donc techniquement supportée.

**Mais 4 surfaces qui parlent de rebalancing/projection passent à côté du format** :

1. **Scenario Lab `<RebalancingActions>`** — affiche des actions de rebalancing *en clair* (label + detail seul) sans PTAI. **P1**.
2. **Investor Memo PDF — page BTC Tactical** — tableau "Active PTAI triggers" qui ne montre que 3 colonnes (Kind / Condition / Action), **Projection et Impact absents** alors que le texte de commentary dit explicitement « Projection - Trigger - Action - Impact ». **P1**.
3. **Admin Governance Proposal Detail** (`/admin/governance/proposal/[id]`) — un rebalancing peut être proposé via une proposal, mais la page n'affiche que `justification` + `calldata` brut. Aucun bloc PTAI. **P1**.
4. **Agent Scenario Narrative** (`scenarioNarrativeOutputSchema`) — sortie structurée Zod ne retourne PAS P/T/A/I : `narrative_md / risk_warning / confidence / key_drivers`. La narrative est libre, rien ne garantit qu'elle suit PTAI. **P1** (pas P0 car le `<PtaiBlock>` côté UI dérive lui-même P/T/A/I depuis l'engine output, pas depuis l'agent — l'agent ajoute du commentaire à côté).

Surfaces conformes (qui passent par `<Ptai>` ou `<PtaiBlock>`) : 6 usages identifiés, tous corrects sur l'ordre et la complétude des 4 props.

---

## Surfaces PTAI

### ✅ Utilise `<Ptai>` correctement (6)

| Surface | Fichier | Type | Note |
|---|---|---|---|
| Scenario Lab — output panel | `src/components/scenario/output-panel.tsx:376` + `src/components/scenario/ptai-block.tsx` | Projection | `<PtaiBlock output={output}/>` dérive P/T/A/I depuis le ScenarioOutput pur. 4 champs complets, ordre OK. |
| Admin Projection Studio | `src/app/admin/projection/studio.tsx:617` | Projection | 4 strings inline, ordre OK, disclaimer #10 présent ligne 627. |
| Admin Activity Feed (modal) | `src/components/admin/activity-feed.tsx:91` | Rebalance event | 4 props OK, **mais** `projection` est hardcodé à `"Recent ${ruleId} event captured by the engine."` — voir P2 ci-dessous. |
| Admin Rebalance Card | `src/components/admin/rebalance-card.tsx:286` | Rebalance event | 4 props alimentées depuis la DB (`event.projection`, etc.). Fallback `"No projection data available."` si vide — voir P2. |
| Vault Invest Form (step 3) | `src/components/vaults/invest-form.tsx:382` | Projection investisseur | `buildPtai()` ligne 66 retourne `{projection, trigger, action, impact}`. Disclaimer #10 dans `<TimeToTargetChart>`. |
| Inngest rebalancing-signal cron | `src/lib/inngest/functions/rebalancing-signal.ts:293` + `src/lib/engine/rebalancing-rules.ts` | Persistance | Chaque `RebalanceSignal` issue de `evaluateRules()` porte les 4 champs, validés par `assertNoForbiddenWords` ligne 201-204 du moteur. |

### ❌ Réimplémente ou contourne (1 majeur)

| Surface | Fichier | Note |
|---|---|---|
| Scenario Lab — `RebalancingActions` | `src/components/scenario/rebalancing-actions.tsx` | Affiche jusqu'à 4 actions de rebalancing en cartes avec **label + detail seuls** (ligne 162-173). Pas de Projection, pas de Trigger explicite, pas d'Impact. Une « rebalancing action » sans PTAI viole §3. |

### ⚠️ Manquant ou partiel (3)

| Surface | Fichier | Manque |
|---|---|---|
| Investor Memo PDF — page BTC Tactical | `src/lib/pdf/memo-pages/btc-tactical.tsx:75-119` | Le tableau est titré « **Active PTAI triggers** » et le commentary parle de « Projection - Trigger - Action - Impact », mais les colonnes affichées sont seulement Kind / Condition / Action / Status. **Projection et Impact absents du PDF**. |
| Admin Governance Proposal Detail | `src/app/admin/governance/proposal/[id]/page.tsx:170-190` | Pour une proposal `rebalanceVault` (cf. `ProposalActionType`), aucun bloc PTAI ; seule la `justification` libre + calldata. Le signer ne voit pas le format normé pour décider. |
| Admin Governance Propose Form | `src/app/admin/governance/propose/page.tsx` | Le formulaire de création d'une proposal de rebalancing n'a qu'un champ `justification` (placeholder ligne 147 mentionne « expected impact » mais sans schéma). Donne lieu à la lacune ci-dessus. |
| Agent Scenario Narrative output | `src/lib/agents/scenario-narrative.ts` + `src/lib/agents/schemas.ts:18-25` | Le schéma Zod retourne `{narrative_md, risk_warning, confidence, key_drivers}` — pas de champs P/T/A/I. La narrative libre peut ou non suivre PTAI ; rien dans le system prompt (ligne 58-76) ne l'exige (PTAI n'est même pas cité). **Drift garanti à long terme.** |
| Agent Investor Memo — `scenario_analysis` | `src/lib/agents/investor-memo.ts:89` | Le prompt dit « PTAI format **where applicable** » mais le schéma `scenario_analysis: z.string().min(1)` n'enforce rien. « Where applicable » = porte de sortie. |

---

## Findings

### P0 (bloquant)

Aucun. Le contrat `<Ptai>` est sain et les surfaces principales (Scenario Lab output, Activity Feed, Rebalance Card admin, Invest Form, Inngest signal, Projection Studio) sont conformes ou faciles à corriger.

### P1 (à corriger avant golive)

- **P1.1 — `<RebalancingActions>` n'utilise pas `<Ptai>`.**
  Fichier : `src/components/scenario/rebalancing-actions.tsx`.
  Impact : surface utilisateur clé du Scenario Lab. Liste des actions de rebalancing rendue en `label + detail` seuls. Viole CLAUDE.md §3 ("rebalancing actions").
  Fix : déplier chaque action en `<Ptai>` (P à dériver du contexte, T = `rule.id + condition`, A = `trigger.action`, I = APY-delta estimé). L'engine fournit déjà ces 4 dimensions via `output.btc_tactical.triggers` et `output.apy_range`.

- **P1.2 — PDF Investor Memo « Active PTAI triggers » n'affiche que 3 champs.**
  Fichier : `src/lib/pdf/memo-pages/btc-tactical.tsx:75-119`.
  Impact : le PDF investisseur (delivrable contractuel) annonce PTAI mais en livre les 3/4. Risque réputationnel + spec drift.
  Fix : ajouter 2 colonnes (Projection, Impact) ou passer en layout 4-lignes par trigger comme le composant web. Données disponibles côté engine (cf. `RebalanceSignal` qui les porte déjà).

- **P1.3 — Page Proposal Detail (gouvernance) sans PTAI.**
  Fichier : `src/app/admin/governance/proposal/[id]/page.tsx`.
  Impact : un multisig signer décide sur une rebalancing action sans voir le format normé. Justification libre seule = risque opérationnel + audit-trail incomplet.
  Fix : si `proposal.actionType === "rebalanceVault"`, joindre le `RebalanceEvent` source (via une FK ou un champ ajouté), passer ses 4 strings à `<Ptai>`. Si pas de FK, déduire les 4 du calldata.

- **P1.4 — Schéma agent `ScenarioNarrative` ne contient pas P/T/A/I.**
  Fichier : `src/lib/agents/schemas.ts:18-25` + `src/lib/agents/scenario-narrative.ts:58-76`.
  Impact : le LLM peut produire une narrative qui contredit PTAI ou perd l'ordre. Aucun garde-fou Zod ni linter. Le system prompt ne mentionne même pas le mot « PTAI ».
  Fix au choix :
    1. Étendre le schéma : `{narrative_md, risk_warning, confidence, key_drivers, ptai: {projection, trigger, action, impact}}` avec `.strict()`.
    2. Ou imposer dans le system prompt + ajouter un validateur post-LLM `assertContainsPtaiSections(narrative_md)`.
  L'option 1 est plus solide (structuré → testable, jamais oublié à l'affichage).

### P2 (à fixer post-golive)

- **P2.1 — `<ActivityFeed>` projection placeholder vide.**
  Fichier : `src/components/admin/activity-feed.tsx:92`.
  La string `"Recent ${ruleId} event captured by the engine."` est techniquement présente mais sans valeur informationnelle. Devrait pull `event.projection` depuis la DB (le champ existe : `RebalanceEvent.projection`). Voir comment `rebalance-card.tsx:287` le fait correctement.

- **P2.2 — Fallback `"No projection data available."` (rebalance-card.tsx:287)** : à supprimer une fois P2.1 résolu et après s'être assuré qu'aucun row historique n'a `projection === ""` (le `@default("")` de Prisma laisse cette possibilité ouverte).

- **P2.3 — Investor Memo agent `scenario_analysis` PTAI « where applicable »** : trop laxiste. Soit on impose strictement le format, soit on documente clairement le critère "applicable". Recommandation : imposer + ajouter sous-schéma `scenario_ptai: array<{projection, trigger, action, impact}>` à côté du markdown libre.

- **P2.4 — Vocabulaire incohérent côté label** : `<PtaiBlock>` titre « Projection · Trigger · Action · Impact » alors que `<Ptai>` interne utilise des labels en minuscule sans séparateur entre. Cohérence visuelle mineure.

### Vérifications passées ✅

- **Ordre P→T→A→I** : `ROWS` du composant `Ptai` (lignes 13-18) figent l'ordre. Toutes les surfaces appellent avec props nommées → impossible d'inverser. OK partout.
- **Aucun champ optionnel** dans `PtaiProps` (`src/components/ui/ptai.tsx:3-9`) : 4 strings requis, aucun `?`. Conforme.
- **Persistance** : `prisma/schema.prisma:139-142` : `triggerText`, `actionText`, `impactText` sont `String` requis ; `projection String @default("")` — **petit risque** : le défaut vide ouvre la porte à des PTAI à 3 champs en DB historique. Idempotency : migrer une fois via backfill ou faire un `String` non-optional pour les nouveaux rows.
- **Mots interdits** : `evaluateRules()` (cf. `src/lib/engine/rebalancing-rules.ts:201-204`) appelle `assertNoForbiddenWords` sur les 4 strings à la sortie de l'évaluateur. Bon garde-fou.

---

## Recommandations (ordre de bataille)

1. **P1.1 — RebalancingActions → `<Ptai>`** (1 fichier, ~50 lignes). Plus visible côté Scenario Lab.
2. **P1.4 — Étendre `ScenarioNarrativeOutputSchema` avec un sous-objet `ptai`** ou ajouter validateur. Plus haut levier long-terme (l'agent est appelé par plusieurs surfaces dont le PDF).
3. **P1.2 — PDF BTC Tactical : 4 colonnes au lieu de 3.** Suit P1.4 idéalement (pour récupérer P+I directement depuis l'agent ou l'engine).
4. **P1.3 — Proposal Detail : joindre RebalanceEvent + afficher `<Ptai>`.** Nécessite probablement une FK `GovernanceProposal.rebalanceEventId` (migration Prisma).
5. **P2.1 + P2.2 — Activity Feed projection** : remplacer placeholder, supprimer fallback.
6. **P2.3 — Investor Memo agent** : durcir `scenario_analysis`.
7. Migration `RebalanceEvent.projection` → non-optional + backfill historique (1 ligne SQL).

---

## Surfaces auditées (couverture)

- `src/components/ui/ptai.tsx` (primitive)
- `src/components/scenario/ptai-block.tsx`
- `src/components/scenario/output-panel.tsx`
- `src/components/scenario/rebalancing-actions.tsx`
- `src/components/admin/activity-feed.tsx`
- `src/components/admin/rebalance-card.tsx`
- `src/components/vaults/invest-form.tsx`
- `src/app/admin/projection/studio.tsx`
- `src/app/admin/governance/proposal/[id]/page.tsx`
- `src/app/admin/governance/propose/page.tsx`
- `src/app/admin/signals/page.tsx` + `actions.ts`
- `src/lib/inngest/functions/rebalancing-signal.ts`
- `src/lib/engine/rebalancing-rules.ts`
- `src/lib/agents/schemas.ts`
- `src/lib/agents/scenario-narrative.ts`
- `src/lib/agents/investor-memo.ts`
- `src/lib/pdf/memo-pages/btc-tactical.tsx` (+ autres pages PDF parcourues, aucun autre PTAI trouvé)
- `src/lib/mock/dashboard.ts` (type `PtaiEvent` aligné)
- `src/lib/demo/fixtures.ts` (rebalance events PTAI)
- `prisma/schema.prisma` (RebalanceEvent)
- `docs/spec/07-rebalancing-rules.mdx` §40

Surfaces *non* concernées (justifié) : `src/components/portfolio/recent-activity.tsx` (affiche transactions deposit/claim/distribution, pas des rebalancing actions).
