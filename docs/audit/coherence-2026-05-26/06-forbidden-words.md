# Audit — Forbidden-words enforcement (Non-négociable #5)

Date : 2026-05-26
Auditeur : read-only (Claude Opus 4.7 — 1M ctx)
Périmètre : tout chemin produisant du texte vers un LP / IR (agents Kimi, wizard admin, PDF mémo, PDF statement, templates de notifications, copy UI éditable).

---

## Résumé exécutif

L'enforcement de la liste interdite est **fragmenté en 6 implémentations indépendantes**, chacune avec sa propre liste et ses propres règles de matching. Le validator canonique (`src/lib/agents/validators.ts`) est correctement câblé sur les **4 agents Kimi** (scenario-narrative, mining-health, risk-explanation, investor-memo) sur tous leurs champs textuels. Trois divergences de liste, deux paths qui contournent totalement la règle, un comportement de matching dangereux sur les templates de notifications, et zéro test individuel couvrant `wizard-forbidden-words-inline` (déclaré "validated" en roadmap).

Compte global : **6 implémentations parallèles**, **5 listes de mots distinctes** (3 à 5 mots, 1 seule à 6), **2 paths LP-facing non protégés** (statement PDF, in-app notifications côté router auto-strip), **1 P0 légal** (templates notif. : "guaranteed", "guarantees", "guaranteeing" passent silencieusement).

---

## Liste vraie vs liste déclarée

| Source | Mots | Notes |
|---|---|---|
| **CLAUDE.md §5** (spec humaine) | guarantee, promise, certain, will deliver, risk-free | 5 mots |
| **`/docs/spec/09-agents.mdx` ligne 27** | guarantee, promise, certain, will deliver, risk-free | 5 mots (idem CLAUDE.md) |
| **`src/lib/agents/validators.ts`** (canonique runtime) | guarantee, promise, certain, will deliver, risk-free, **no risk** | **6 mots** — `no risk` ajouté sans propagation |
| **`src/lib/hooks/use-forbidden-words.ts`** (wizard inline) | guarantee, promise, certain, will deliver, risk-free | 5 mots — `no risk` absent |
| **`src/app/admin/vaults/actions.ts`** (server-action vault create/edit) | guarantee, promise, certain, will deliver, risk-free | 5 mots — duplication locale, `no risk` absent |
| **`src/lib/notifications/router.ts`** (templates email/telegram/in_app) | guarantee(?!d), promise, certain(?!ly not), will deliver, risk-free | 5 mots — regex inline, **exclut volontairement `guaranteed`** |
| **`src/app/onboarding/__tests__/paths.test.tsx`** | guarantee, promise, certain, will deliver, risk-free | 5 mots — duplication test |
| **`src/components/portfolio/__tests__/*`** (≥4 fichiers) | guarantee, promise, certain, will deliver, risk-free | 5 mots — duplications test |
| **`src/lib/demo/fixtures.ts`** | 6 mots (avec `no risk`) | en commentaire seulement |
| **`src/lib/engine/{scenario,backtest,rebalancing-rules,btc-tactical}.ts`** | 6 mots (avec `no risk`) | en commentaires (engine pur, pas d'output texte) |
| **`src/lib/inngest/functions/__tests__/rebalancing-signal.test.ts`** | 6 mots (avec `no risk`) | test, ok |

**Divergence 1 (P0 documentaire)** : le code canonique (`validators.ts`) contient **6 mots**, alors que CLAUDE.md §5 et `/docs/spec/09-agents.mdx` en déclarent **5**. La règle légale n'est plus traçable à sa source écrite.

**Divergence 2 (P0 cohérence)** : 4 autres listes en dur (`use-forbidden-words.ts`, `vaults/actions.ts`, `notifications/router.ts`, tests d'onboarding/portfolio) **omettent `no risk`**. Un LP voit donc un wizard qui laisse passer "no risk" alors qu'un agent Kimi le rejetterait.

**Divergence 3 (P1)** : `notifications/router.ts` utilise `\b(?:guarantee(?!d)|...)\b` — il **autorise délibérément `guaranteed`** en regex, alors que le validator canonique catche tous les inflectés (`guarantee\w*`). Le commentaire dit "not guaranteed est l'unique forme permise" mais la regex laisse passer "guaranteed 12% APY" tout seul, sans négation. Voir P0₁ ci-dessous.

---

## Paths protégés / paths contournés

### Protégés (call-site direct vers `assertNoForbiddenWords`)

| Path | Fichier | Champs validés |
|---|---|---|
| Agent scenario-narrative | `src/lib/agents/scenario-narrative.ts:215-216` | `narrative_md`, `risk_warning` |
| Agent mining-health | `src/lib/agents/mining-health.ts:146-147` | `summary`, `recommendation` |
| Agent risk-explanation | `src/lib/agents/risk-explanation.ts:185-189` | `explanation`, `suggested_guardrail` (par risque) + `overall_summary` |
| Agent investor-memo | `src/lib/agents/investor-memo.ts:285-292` | 8 sections (executive_summary, vault_structure, scenario_analysis, risk_section, mining_section, performance_section, methodology_note, disclaimer) |
| Wizard step Identity (vault create) | `_vault-form.tsx:299,326,562` via `<ForbiddenWordsInput>` + serveur `vaults/actions.ts:71-135` | `name`, `description`, `disclaimers` — **double-protection client + Zod refine serveur** |
| Notifications templates (boot-time) | `notifications/router.ts:128-136` | `subject` + `body` au chargement du module — fail-fast au démarrage |

### Contournés (génèrent du texte → LP/IR sans valider)

| # | Path | Risque | Détails |
|---|---|---|---|
| **1** | **`src/app/api/statements/[id]/pdf/route.tsx`** | LP statement PDF mensuel | Le PDF est entièrement construit à partir de literals dans le fichier (« This statement is for informational purposes only… »). Aucun import de validator. Si un dev ajoute une nouvelle ligne de copy fixe, rien ne l'attrape. |
| **2** | **`src/lib/pdf/memo-template.tsx` + `src/lib/pdf/memo-pages/*.tsx`** | PDF investor memo téléchargeable | Le PDF mémo accepte `memo: InvestorMemoOutput \| null` (`memo-data.ts:33`). Quand `memo === null` (mode dev / fallback), des chaînes statiques sont injectées dans les pages (`disclaimer.tsx:12`, `risk-framework.tsx:146`, etc.). Aucune assertion au render. La validation ne court qu'en amont via l'agent — si on bypasse l'agent (preview, fixture, rerun loadé depuis DB sans re-valider), le PDF imprime sans linter. |
| **3** | **`src/app/admin/projection/actions.ts` → `PROMOTE_DEFAULTS.disclaimers`** | Push admin → création vault | Le promote action seed `disclaimers` depuis une constante (`actions.ts:243`). Si un admin édite cette constante, elle n'est jamais re-validée à l'import. Le serveur Zod refine du vault create rattrape, donc P2 seulement, mais c'est de la défense en profondeur ratée. |
| **4** | **`MonteCarloReview` (wizard step 6)** | UI admin in-flow | Le composant `src/components/admin/monte-carlo-review.tsx` n'a **aucun** input texte éditable lié à `useForbiddenWords`. La copy ("Projections — not guaranteed.") est en dur. La roadmap MVP+ déclare `wizard-forbidden-words-inline` "validated" — c'est vrai pour `_vault-form.tsx` (steps 1 & 2), **mais pas pour le step 6 MC review**. Si demain on ajoute un champ commentaire admin sur le MC, il ne sera pas protégé par défaut. |
| **5** | **`src/lib/notifications/router.ts:121-122`** | Email/Telegram/in-app LPs | Regex `guarantee(?!d)` — `guaranteed`, `guarantees`, `guaranteeing` passent. Même chose pour `certain(?!ly not)` qui laisse passer "certainly" tout court ou "certain return". Le validator canonique attrape ces formes via `\\b<needle>\\w*`. Voir **P0₁**. |
| **6** | **`InvestorMemoOutput` re-loaded depuis DB → PDF** | PDF mémo téléchargé après-coup | `memo-data.ts` reçoit un `InvestorMemoOutput` typé Zod, mais la validation forbidden-words n'est faite qu'à la **génération** par l'agent (`investor-memo.ts:285-292`). Si la sortie est persistée en DB puis re-lue plus tard, aucun second filet. Si un admin tweake la copy via Prisma Studio (mémo stocké), le PDF imprime sans broncher. P1. |

---

## Findings P0 / P1 / P2

### P0 — bloquants légaux

**P0₁ — `notifications/router.ts` autorise `guaranteed` sur des templates LP-facing**
- Fichier : `src/lib/notifications/router.ts:121-122`
- Regex : `/\b(?:guarantee(?!d)|promise|certain(?!ly not)|will deliver|risk-free)\b/i`
- Impact : un template `proposal-executed.email.md` peut contenir "Your guaranteed 12% APY proposal was executed" et passer au boot. Les emails partent automatiquement aux LPs via Resend (cf. `notifications/actions.ts`). C'est exactement le sinistre que la règle #5 prévient.
- Reproductibilité : ajouter `guaranteed` dans n'importe quel `.email.md`, l'assert au boot ne tape pas.

**P0₂ — Liste canonique runtime (6 mots) ≠ spec écrite (5 mots)**
- Fichier : `src/lib/agents/validators.ts:11-18` (ajout de `"no risk"`) vs `CLAUDE.md:28` et `docs/spec/09-agents.mdx:27`.
- Impact : la **règle légale est ambigüe** — si un commercial Hearst écrit "no risk" dans un draft, soit ça passe (UI wizard, liste à 5), soit ça est rejeté (agent, liste à 6). En procédure légale, on présente quelle source de vérité ?
- Reproductibilité : `grep "no risk" docs/spec/09-agents.mdx CLAUDE.md` → absent.

**P0₃ — `no risk` non détecté par le wizard inline**
- Fichier : `src/lib/hooks/use-forbidden-words.ts:15-21`
- Impact : un admin tape "no risk" dans le `description` du vault → pas de squiggle rouge. Le serveur Zod refine `vaults/actions.ts:30` (qui utilise sa propre liste à 5) le laisse passer aussi. Le vault est créé avec "no risk" dans son nom/description.
- Note : aucun agent n'est invoqué sur le formulaire vault → cette donnée n'est jamais nettoyée par le canonique.

### P1 — sérieux

**P1₁ — PDF mémo non re-validé au render**
- Fichiers : `src/lib/pdf/memo-template.tsx`, `src/lib/pdf/memo-pages/*.tsx`, `src/lib/pdf/memo-data.ts`
- Impact : aucune assertion forbidden-words au moment du `renderToBuffer`. Le filet existe seulement à la génération du `InvestorMemoOutput`. Si la sortie est : a) cachée en DB puis re-rendue, b) mockée en dev, c) seedée par fixture, le PDF imprime sans contrôle.
- Recommandation : ajouter une passe `assertNoForbiddenWords` sur les 8 champs juste avant `renderToBuffer`.

**P1₂ — PDF statements LP (`/api/statements/[id]/pdf`) sans validator**
- Fichier : `src/app/api/statements/[id]/pdf/route.tsx`
- Impact : tout le texte du PDF (légendes, footers, disclaimers) est en literal dans le fichier. Aucun garde-fou si un dev introduit une phrase prohibée. Le PDF part au LP signé Hearst → exposition juridique directe.

**P1₃ — `vaults/actions.ts` redéfinit sa propre liste**
- Fichier : `src/app/admin/vaults/actions.ts:20-26,28-34`
- Impact : couplage divergent. La fonction `containsForbiddenWord` n'utilise pas la même normalisation que le canonique (pas d'inflexion, pas de négation exception). Bonne foi pour le contenu structuré du vault mais ce serait plus simple et plus sûr d'importer `assertNoForbiddenWords` du module canonique.
- Recommandation : remplacer par `import { assertNoForbiddenWords, FORBIDDEN_WORDS } from "@/lib/agents/validators"`.

**P1₄ — Aucun test unitaire dédié dans `src/lib/agents/__tests__/`**
- Le seul test qui itère sur `FORBIDDEN_WORDS` est `schemas.test.ts:177-180` (« covers every word in FORBIDDEN_WORDS »). C'est bien, mais il n'y a pas de fichier dédié `validators.test.ts` ; tout est mélangé avec les schemas. Sur `__tests__/` il n'y a même pas de fichier `validators.test.ts`.
- Recommandation : extraire dans `__tests__/validators.test.ts` avec couverture forme inflectée par mot (guaranteed, guarantees, promises, promised, certainty, certainly, risk-free-ish).

### P2 — défense en profondeur

**P2₁ — `wizard-forbidden-words-inline` (roadmap MVP+ "validated") couvre 3 champs sur ≥6**
- Le wizard `_vault-form.tsx` n'utilise `<ForbiddenWordsInput>` que sur `name`, `description`, `disclaimers`. Les champs `ticker`, `colorTag`, `signersWhitelist` ne sont pas inlinés (mais ticker/colorTag sont déjà très contraints, donc faible risque).
- L'item roadmap déclare la chose "validated" sans préciser la portée. À documenter dans l'item evidence.

**P2₂ — Constantes hard-codées (4 listes dupliquées)**
- `validators.ts`, `use-forbidden-words.ts`, `vaults/actions.ts`, `notifications/router.ts`, plus les tests. Une seule source devrait suffire.
- Recommandation : exporter `FORBIDDEN_WORDS` depuis un module pur partagé (`src/lib/legal/forbidden-words.ts`) + re-exporter depuis validators.

**P2₃ — `MonteCarloReview` non-protégé en cas d'évolution**
- Le composant ne contient aujourd'hui aucune copy LP-facing modifiable. Si on ajoute demain un champ commentaire admin pour annoter le MC avant validation, par défaut il ne sera pas protégé. À garder en tête pour la prochaine itération wizard.

---

## Recommandations (priorité décroissante)

1. **(P0₁)** Réécrire la regex `notifications/router.ts:121` pour réutiliser **directement** `assertNoForbiddenWords` du canonique. Supprimer la regex inline et son comportement laxiste.
2. **(P0₂)** Décider la source de vérité légale : soit ajouter `no risk` à CLAUDE.md §5 + `/docs/spec/09-agents.mdx:27`, soit retirer `no risk` de `validators.ts:17`. Cette ambiguïté doit être tranchée par produit/legal **avant** un audit externe.
3. **(P0₃)** Faire pointer `use-forbidden-words.ts`, `vaults/actions.ts`, `onboarding/__tests__/paths.test.tsx` et tous les tests `__tests__/*.test.ts` vers le `FORBIDDEN_WORDS` canonique exporté depuis `@/lib/agents/validators`. Supprimer les 4 duplications.
4. **(P1₁ + P1₂)** Ajouter une fonction `assertMemoPdfSafe(data)` et `assertStatementPdfSafe(strings)` invoquées **juste avant `renderToBuffer`**. Coût quasi-nul, défense en profondeur indispensable.
5. **(P1₃)** Refactorer `vaults/actions.ts` pour `import { assertNoForbiddenWords } from "@/lib/agents/validators"` et utiliser la même logique de négation que le canonique (sinon "outcomes are not guaranteed" sera rejeté à tort dans les disclaimers).
6. **(P1₄)** Créer `src/lib/agents/__tests__/validators.test.ts` (extraction propre depuis `schemas.test.ts`) avec un test par mot × par forme inflectée + tests dédiés à la fenêtre de négation (lookbehind + lookahead).
7. **(P2)** Documenter dans `/docs/decisions/ADR-XXX-forbidden-words.md` la liste canonique unique, sa portée (4 agents + PDF + emails + UI wizard), et la justification de la fenêtre de négation 3-mots avant/après.

---

## Termine en 5 lignes

- **Findings : 3 P0 + 4 P1 + 3 P2 = 10 total.**
- 6 implémentations de la règle au lieu d'une seule, listes divergentes (5 vs 6 mots), aucun ADR.
- **Contournement #1 le plus grave (P0₁)** : `notifications/router.ts` utilise la regex `guarantee(?!d)` — `guaranteed 12% APY` passe au boot et part par email Resend aux LPs.
- **Contournement #2 le plus grave (P0₂/P0₃)** : `no risk` est dans le validator agent (6 mots) mais absent de CLAUDE.md, de la spec, du wizard inline, et du Zod vault create — règle légale ambiguë + fuite UI possible.
- Action immédiate : trancher la liste source de vérité + faire pointer les 4 duplications vers le canonique + remplacer la regex notif. par `assertNoForbiddenWords`.
