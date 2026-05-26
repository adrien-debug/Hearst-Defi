# Audit cohérence — Versions de méthodologie (2026-05-26)

**Auditeur** : agent read-only
**Scope** : `docs/methodology/{v1.0.md, v2.0.md, v2.0-draft.md}` + ADR-006/007/008/009 + tout site (src/, docs/, prisma/) qui hardcode une `methodology_version`.
**Règle de référence** : CLAUDE.md §7 « Methodology v1.0 immutable, bump version (v1.1/v2.0) requires ADR ». ADR-006 §Consequences : *« A new `docs/methodology/v2.0.md` is published for the Monte Carlo projection mode; v1.0 stays the immutable rule-based reference. »*

---

## Résumé exécutif (3 lignes)

Deux fichiers (`v2.0.md` ratifié 2026-05-22 + `v2.0-draft.md` non ratifié 2026-05-26) revendiquent **le même numéro `v2.0`** avec des contenus matériellement différents (path count 10 000 vs 1 000, ajout de share classes + multi-vault dans le draft). Tout le code (engine, agents, Prisma, UI) reste **piné sur `v1.0`** alors que le wizard `MonteCarloReview` consomme l'engine v2.0 mais affiche le label `v2.0-draft` à l'investisseur — incohérence directe entre la source de vérité texte et la valeur écrite en DB / dans les memos. La chaîne de supersession déclarée (« v2.0 étend v1.0 ») n'est pas trahie par le code, mais elle est trahie par la coexistence de deux v2.0 contradictoires.

---

## Findings P0

### P0-1 — Collision de numéro de version : deux `v2.0` coexistent avec contenus différents

- **Fichiers** : `docs/methodology/v2.0.md:1-3` (Status: **Active**, Effective: 2026-05-22) vs `docs/methodology/v2.0-draft.md:8-11` (Status: **DRAFT**, Drafted: 2026-05-26, header rappelle « Live methodology remains v1.0 »).
- **Évidence** :
  - `v2.0.md:1` → `# Hearst Yield Vault — Methodology v2.0 (Monte Carlo extension)`
  - `v2.0-draft.md:8` → `# Hearst Vault Family — Methodology v2.0 (Draft)`
  - `v2.0-draft.md:38` table de lineage : `| v2.0-draft | Draft | — | This document. Adds MC, multi-vault, share classes |` — le draft ne mentionne **pas** que `v2.0.md` est déjà publié-ratifié.
  - Contenus matériellement divergents :
    - **Path count** par défaut : `v2.0.md:43` = **10 000** vs `v2.0-draft.md:97` = **1 000** (minimum 500).
    - **Scope** : `v2.0.md` = MC seul (mono-vault). `v2.0-draft.md` ajoute §3 multi-vault, §4 share classes, §7 forbidden vocab consolidé.
    - **ADRs touched** : `v2.0.md` cite ADR-006 seulement, `v2.0-draft.md` cite ADR-006 + ADR-007 (et réserve ADR-008/ADR-009 alors qu'ils sont déjà acceptés).
- **Violation** : CLAUDE.md §7 « Methodology v1.0 immutable, bump version (v1.1/v2.0) requires ADR ». La règle est doublement violée : (a) deux docs portent le même numéro ; (b) le draft de 2026-05-26 doit logiquement être `v2.1` (additif : share classes + multi-vault, comparabilité préservée per `v2.0-draft.md:48`) ou `v3.0` (formule recalibrée : path count divisé par 10).
- **Action** : Renommer le draft `v2.0-draft.md` → `v2.1-draft.md` (additif, conserve la comparabilité v2.0) ou `v3.0-draft.md` si le changement de path count est considéré comme rompant la comparabilité. Mettre à jour la table §1.1 et le footer. Ouvrir un ADR-010 dédié à la promotion (v2.0-draft.md §1.3 le requiert déjà).

### P0-2 — UI investisseur affiche `v2.0-draft` alors que le draft n'est pas ratifié

- **Fichier:ligne** : `src/components/admin/monte-carlo-review.tsx:165` + `:210` ; `src/app/admin/vaults/_vault-form.tsx:740` ; `src/components/scenario/monte-carlo-panel.tsx:390`.
- **Évidence** :
  - `monte-carlo-review.tsx:210` → `Projections — not guaranteed. Methodology v2.0-draft. Simulated paths...`
  - `monte-carlo-review.tsx:165` → `title="Methodology v2.0-draft — optional companion to the rule-based engine"`
  - `monte-carlo-panel.tsx:390` → `Monte Carlo — methodology v2.0 draft. Not guaranteed.`
  - Header explicite du draft (`v2.0-draft.md:1-5`) : *« ⚠️ DRAFT — not yet ratified. (...) must not be used as a reference in production projections, investor memos, or LP-facing disclosures until it is promoted »*.
- **Violation** : Le draft interdit explicitement son usage en production LP-facing. Le wizard de création de vault (admin LP-flow) et la scenario lab affichent la mention « v2.0-draft » à l'écran.
- **Action** : Soit (a) bloquer l'affichage MC en prod tant que `v2.0.md` (le ratifié) reste le seul Active, soit (b) repointer ces 3 sites vers `v2.0` (le doc ratifié 2026-05-22 qui définit déjà MC). Conditionner via `FEATURE_FLAGS.ENABLE_MONTE_CARLO` qui existe déjà (`scenario-lab/page.tsx:67`).

### P0-3 — Engine MC en prod consomme la spec v2.0 ratifiée mais commentée « v2.0 » sans collision-check

- **Fichier:ligne** : `src/lib/engine/monte-carlo.ts:1,11` ; `src/app/admin/scenario-lab/actions.ts:258`.
- **Évidence** :
  - `monte-carlo.ts:1` → `// Monte Carlo projection mode (methodology v2.0, ADR-006).`
  - `monte-carlo.ts:19` → `const DEFAULT_PATHS = 10_000;` → **conforme à `v2.0.md:43`** mais **divergent de `v2.0-draft.md:97`** (default 1 000).
  - `monte-carlo-review.tsx:137` UI prod appelle `runMonteCarlo(..., { seed: 42, runs: 1000 })` → consomme **la valeur du draft** (1000) tout en bypassant le default 10 000 du ratifié. L'utilisateur final voit donc 1 000 paths + label « v2.0-draft ».
- **Risque** : Quand le draft sera promu (ou re-numéroté), le code mélange déjà les deux sources de paramètres. Aucun champ `methodologyVersion` n'est écrit dans `MonteCarloOutput` (cf. `monte-carlo.ts:83-92`), donc impossible de tracer a posteriori quelle version a généré la projection.
- **Action** : (1) Ajouter `methodologyVersion: "v2.0"` dans `MonteCarloOutput`. (2) Décider explicitement (path count : 1k ou 10k) et purger l'autre. (3) Persister la version utilisée dans toute table qui stocke un résultat MC (à ajouter — voir P1-3).

---

## Findings P1

### P1-1 — Tout le code applicatif est piné sur v1.0 alors que v2.0 (MC) est en prod

- **Fichiers** :
  - `src/lib/agents/system-prompts/methodology.ts:18,22` → `METHODOLOGY_PATH = .../v1.0.md` + `METHODOLOGY_VERSION = "v1.0"`
  - `src/lib/engine/scenario.ts:19` → `export const METHODOLOGY_VERSION = "v1.0";`
  - `src/lib/engine/vaults.ts:53` → `const METHODOLOGY_V1 = "v1.0";` (assigné aux 3 vaults : yield, defensive, btc-plus)
  - `src/app/admin/projection/studio.tsx:57` → `const METHODOLOGY_VERSIONS = [{ id: "v1.0", label: "v1.0 (current)" }];` (un seul élément → sélecteur trompeur)
- **Violation** : Les 4 agents (`scenario-narrative`, `mining-health`, `risk-explanation`, `investor-memo`) injectent le système-prompt v1.0 dans Kimi, peu importe qu'on soit en mode MC ou rule-based. Une projection MC produite par l'engine v2.0 sera annotée `methodology_version=v1.0` (cf. `scenario.ts:198`, `backtest.ts:58,87,113`, `mock/investor-memo.ts:65,88,...`).
- **Évidence directe** : `inngest/functions/__tests__/investor-memo-monthly.test.ts:156` → `expect(data.methodologyVersion).toBe("v1.0");` — test gelé sur v1.0, garantit que la régression suivante (passer en v2.0) cassera CI.
- **Action** : (1) Bumper `METHODOLOGY_VERSION` à `v2.0` puisque ADR-006 a déjà ratifié `v2.0.md`. (2) `system-prompts/methodology.ts` doit lire `v2.0.md` ou un build composite v1.0+v2.0 (la v2.0 est explicitement additive — `v2.0.md:14-15`). (3) Ajouter un champ engine `mode: "rule-based" | "monte-carlo"` qui détermine quelle version annoter.

### P1-2 — Schéma Prisma : 3 tables défaulent `methodologyVersion = "v1.0"` sans contrainte de validité

- **Fichiers:lignes** : `prisma/schema.prisma:103` (ScenarioRun), `:228` (ReportExport), `:462` (BacktestRun).
- **Évidence** : `methodologyVersion String @default("v1.0")` x3. Aucune enum, aucune FK vers un registre de versions, aucune vérification de format `vX.Y`.
- **Risque** : Un agent qui écrit `methodologyVersion: "1.0"` (sans `v`, déjà présent dans `data/portfolio.ts:441,473` et `__tests__/portfolio-page.test.tsx:411`) passe silencieusement. Le sélecteur admin `projection/studio.tsx:57` ne propose que `v1.0` → un memo généré aujourd'hui en mode MC sortira labelisé `v1.0` (cf. P1-1).
- **Action** : (1) Migrer `methodologyVersion` vers une enum Prisma ou une regex check `^v\d+\.\d+(-draft)?$`. (2) Backfill : aligner `"1.0"` → `"v1.0"`. (3) Garantir qu'un mode MC écrit `v2.0`, pas `v1.0`.

### P1-3 — Incohérence de label `"v1.0"` vs `"1.0"` (avec/sans préfixe `v`)

- **Fichiers:lignes** :
  - Avec `v` : `agents/system-prompts/methodology.ts:22`, `engine/scenario.ts:19`, `engine/vaults.ts:53`, `data/portfolio.ts:395,417`, `vaults/profile.ts:145`, etc. (majorité)
  - Sans `v` : `src/lib/data/portfolio.ts:441,473`, `src/components/portfolio/__tests__/portfolio-page.test.tsx:411`, `src/components/portfolio/yield-stack.tsx:81,243` (defaut `"1.0"`, affichage `methodology v{methodologyVersion}` → rend `methodology v1.0` quand variable = `"1.0"`).
- **Évidence** : `yield-stack.tsx:243` → `not guaranteed · methodology v{methodologyVersion} · ...` ; si `methodologyVersion="v1.0"` est passé (cf. `data/portfolio.ts:395,417` qui pourtant écrit `"v1.0"` ailleurs), le rendu sera `methodology vv1.0`. Le test `portfolio-page.test.tsx:371-372` exige `"v1.0"`, le test `:411` accepte `"1.0"`.
- **Action** : Normaliser sur une seule forme (recommandé : `"v1.0"` puisque c'est la majorité + le nom du fichier source). Ajouter un lint custom ou un type littéral `MethodologyVersion = "v1.0" | "v2.0"`.

### P1-4 — ADR-006 publie « v2.0.md » mais le draft de 2026-05-26 n'a pas d'ADR de promotion

- **Fichiers** : `docs/decisions/ADR-006-lift-mvp-lock-v1-v2.md:68-69` + `docs/methodology/v2.0-draft.md:59-61`.
- **Évidence** :
  - ADR-006 §Consequences : *« A new docs/methodology/v2.0.md is published for the Monte Carlo projection mode »* → autorise un seul v2.0 (le ratifié, 2026-05-22).
  - `v2.0-draft.md:54-63` §1.3 « How to promote this draft » prévoit explicitement : *« Open an ADR (append to docs/decisions/) recording the promotion date »* — cet ADR n'existe pas (ADR-008 = share classes, ADR-009 = multisig, ni l'un ni l'autre ne promeut la méthodologie).
  - La table ADR Cross-Reference `v2.0-draft.md:373-377` réserve « ADR-008 / ADR-009 » comme « *not yet filed* » alors que les deux **sont** filed (08 = share classes, 09 = multisig EIP-712) et n'ont aucun rapport avec une promotion de méthodologie.
- **Action** : Créer `ADR-010-methodology-vNEXT.md` qui (a) acte la collision v2.0 ↔ v2.0-draft, (b) renomme le draft en v2.1 ou v3.0, (c) définit la date de ratification, (d) corrige la table Cross-Reference.

### P1-5 — `v2.0-draft.md` §4 (share classes) duplique ADR-008 sans cohérence

- **Fichier:ligne** : `v2.0-draft.md:213-254` vs `ADR-008-share-classes.md:55-61`.
- **Évidence — divergence numérique** :
  | Param | Draft methodology §4.2 | ADR-008 §Class definitions |
  |---|---|---|
  | Class A lock-up | 60 days | 60 days ✓ |
  | Class B lock-up | **30 days** | **90 days** ✗ |
  | Class A mgmt fee | 1.50% | 1.00% ✗ |
  | Class B mgmt fee | 1.00% | 0.75% ✗ |
  | Class A perf fee | 15% above 8% hurdle | 10% (1000 bps), pas de hurdle mentionné ✗ |
  | Class B perf fee | 10% above 8% hurdle | 8% (800 bps) ✗ |
  | Class A redemption | 30 days notice | non spécifié |
- **Risque** : L'ADR (statut Accepted, 2026-05-26) et le draft méthodologie (statut DRAFT, 2026-05-26 — **même jour**) se contredisent sur les paramètres financiers. ADR-008 §Consequences ligne 98-101 dit que « Methodology v2 draft must include a section on share class impact » — c'est fait, mais avec des **chiffres différents** de l'ADR qui a précédé.
- **Action** : Aligner les deux. Source de vérité = ADR-008 (Accepted) ; mettre à jour `v2.0-draft.md §4.2` pour pointer vers ADR-008 sans recopier les chiffres (ou les copier à l'identique).

---

## Findings P2

### P2-1 — Header `v2.0-draft.md` mentionne `v2.0-final.md` (nom de fichier qui n'existera jamais)

- **Fichier:ligne** : `v2.0-draft.md:4` → *« until it is promoted to `v2.0-final.md` by Product + Risk sign-off. »*
- **Évidence** : Le §1.3 (`:57`) dit *« Rename v2.0-draft.md → v2.0.md »*. Le suffixe `-final` n'est utilisé nulle part ailleurs dans le repo et créerait un troisième fichier `v2.0-*.md`.
- **Action** : Remplacer `v2.0-final.md` par `v2.0.md` (cohérent avec §1.3).

### P2-2 — `v2.0-draft.md §1.2` permet `v2.0 → v2.1`, mais le doc lui-même devrait déjà être `v2.1`

- **Fichier:ligne** : `v2.0-draft.md:47-50` → définition MINOR bump = *« additive clarification, a new vault definition, or a parameter table update »*.
- **Évidence** : Le draft ajoute multi-vault + share classes = exactement ce que la définition MINOR couvre. Donc par sa propre règle, ce doc devrait s'appeler `v2.1-draft.md`.
- **Action** : Renommage cohérent avec §1.2 (overlap avec P0-1 et P1-4).

### P2-3 — Roadmap n'a pas d'item « methodology-v20 »

- **Fichier:ligne** : `docs/roadmap.json:333-338` → seul item méthodologie = `methodology-v10` (status: validated).
- **Évidence** : `grep -c methodology docs/roadmap.json` = 2 (les 2 sont la même entrée). ADR-006 (2026-05-22) a publié `v2.0.md` mais aucun item roadmap ne le track.
- **Action** : Ajouter `methodology-v20` (status: validated, spec_ref: `/docs/methodology/v2.0.md`, evidence: ADR-006) + `methodology-v21-draft` (status: doing, spec_ref: `/docs/methodology/v2.0-draft.md` après renommage).

### P2-4 — `v2.0.md:6` champ « Supersedes for MC mode » sémantiquement faux

- **Fichier:ligne** : `v2.0.md:6` → `**Supersedes for MC mode**: extends v1.0`.
- **Évidence** : « Supersedes » et « extends » sont opposés. Le doc dit lui-même *« does not replace v1.0 »* (`:13`). Le champ devrait s'appeler `Extends` ou `Companion to`.
- **Action** : Renommer le label en `**Extends**: v1.0 (rule-based stays the immutable reference)`.

### P2-5 — Mock data `mock/investor-memo.ts` hardcode `v1.0` x5 sans variable centrale

- **Fichier:ligne** : `src/lib/mock/investor-memo.ts:65,88,111,134,157` → string littéral `"methodology_version=v1.0"`.
- **Évidence** : Même chose dans `lib/agents/loaders/vault.ts:394`. Aucun import de `METHODOLOGY_VERSION`.
- **Action** : Importer `METHODOLOGY_VERSION` depuis `agents/system-prompts/methodology.ts` partout, pour qu'un bump v1.0 → v2.0 propage seul.

### P2-6 — Date `2026-05-26` apparaît trois fois le même jour (ADR-007, ADR-008, ADR-009, v2.0-draft) sans ordre interne

- **Évidence** : ADR-007 + ADR-008 + ADR-009 + `v2.0-draft.md` tous datés `2026-05-26`. Le draft cite ADR-006/007 mais réserve ADR-008/009 comme « not yet filed » — incohérence temporelle dans le même jour.
- **Action** : Soit horodater (ex: timestamp), soit numéroter les ADR par ordre de rédaction et mettre à jour la table Cross-Reference du draft.

---

## Recommandations (ordre suggéré, smallest-impact first)

1. **(P0-1, P1-4, P2-2, P2-3)** : Renommer `docs/methodology/v2.0-draft.md` → `docs/methodology/v2.1-draft.md`. Mettre à jour la table §1.1 lineage, le footer `:381`, et le header `:4` (`v2.0-final.md` → `v2.1.md`). Ouvrir `ADR-010-methodology-v21.md` qui acte le renommage + le plan de promotion.
2. **(P0-2)** : Repointer les 3 strings UI (`monte-carlo-review.tsx:165,210`, `monte-carlo-panel.tsx:390`, `_vault-form.tsx:740`) vers `v2.0` (la version ratifiée) au lieu de `v2.0-draft`. Gater l'affichage MC sur `FEATURE_FLAGS.ENABLE_MONTE_CARLO`.
3. **(P0-3)** : Ajouter `methodologyVersion: "v2.0"` dans `MonteCarloOutput` (engine/monte-carlo.ts:83-92) et le persister dans toute table qui stockera un résultat MC.
4. **(P1-1)** : Bumper `METHODOLOGY_VERSION` à `v2.0` dans `agents/system-prompts/methodology.ts:22` + lire `v2.0.md` (ou concat v1.0+v2.0 puisque additif). Mettre à jour le test `inngest/functions/__tests__/investor-memo-monthly.test.ts:156`.
5. **(P1-2, P1-3)** : Introduire `type MethodologyVersion = "v1.0" | "v2.0"` dans `src/lib/methodology/types.ts`, l'utiliser partout (remplace les `"1.0"` sans `v`). Ajouter check Prisma regex.
6. **(P1-5)** : Aligner `v2.0-draft.md §4.2` sur ADR-008 §Class definitions (source de vérité). Idéalement, le draft pointe vers ADR-008 sans recopier les chiffres.
7. **(P2-4)** : Renommer le label `Supersedes for MC mode` → `Extends` dans `v2.0.md:6`.
8. **(P2-5)** : Importer `METHODOLOGY_VERSION` dans `mock/investor-memo.ts` et `agents/loaders/vault.ts` au lieu de littéraux.

---

## Annexes — chaîne de supersession (déclarée vs réelle)

### Déclarée (lecture des docs)

```
v1.0 (2026-05-13, Active, Immutable)
  ├── extended-by → v2.0 (2026-05-22, Active, MC mode) — ADR-006
  └── overlapped-by → v2.0-draft (2026-05-26, DRAFT, MC+multi-vault+share-classes) — ADR-006/007
```

### Réelle (lecture du code)

```
Engine rule-based  →  annote "v1.0"  (scenario.ts:19, backtest.ts)
Engine MC          →  annote ∅ (aucun champ version dans MonteCarloOutput)
Agents prompts     →  injectent v1.0.md (system-prompts/methodology.ts:18)
DB defaults        →  "v1.0" sur ScenarioRun, ReportExport, BacktestRun
UI vault wizard    →  affiche "v2.0-draft" (monte-carlo-review.tsx:210)
UI scenario lab    →  affiche "v2.0 draft" (monte-carlo-panel.tsx:390)
UI projection      →  sélecteur figé "v1.0 (current)" (studio.tsx:57)
PDF memo           →  hardcode "v1.0" (pdf/memo-pages/risk-framework.tsx:104)
```

→ **3 versions affichées simultanément à l'utilisateur** selon la surface (v1.0, v2.0-draft, v2.0 draft), aucune n'écrivant `v2.0` (le seul état Active légitime).

---

*Rapport généré 2026-05-26 — agent read-only, aucune modification de code.*
