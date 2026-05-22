# Prompt 2 — S2-10 : Fusion OutputPanel + OutputPanelCompact

Copie-colle ce bloc **intégralement** dans Claude :

---

Tu es un développeur frontend senior sur un projet Next.js + React + TypeScript (Hearst DeFi).

**Contexte** : Nous avons deux composants scénario dans `src/components/scenario/` :
- `output-panel.tsx` (450 lignes) — mode "détail complet", utilisé dans `lab-shell.tsx` (scénario solo). Contient : APY Hero, PTAI block, AI Narrative, NavSparkline, Risk & Mining 2×2, Vault Mode, Allocation (stacked bar + table), BTC Tactical, Rebalancing Actions, Assumptions, Disclaimer. Utilise `<Card>`.
- `output-panel-compact.tsx` (298 lignes) — mode "comparatif A/B", utilisé dans `compare-mode.tsx`. Contient : Header Scénario A/B, APY Hero (avec deltas vs A), Risk + Mining 2×1, Vault Mode, Allocation (table compacte sans stacked bar). Utilise `glass-panel` / `glass-panel-subtle`.
- `output-panel-shared.tsx` (35 lignes) — exports communs : `BUCKET_LABEL`, `BUCKET_COLOR`, `CONFIDENCE_VARIANT`, `progressScoreFillClass`.

**Objectif** : Fusionner `output-panel.tsx` et `output-panel-compact.tsx` en UN SEUL composant `OutputPanel` dans `src/components/scenario/output-panel.tsx`, avec une prop `variant?: "full" | "compact"` (défaut `"full"`).

**Spécification détaillée** :

1. **Props communes** (tous modes) :
   ```ts
   interface OutputPanelProps {
     output: ScenarioOutput;
     isPending?: boolean;
   }
   ```

2. **Props mode compact** (uniquement quand `variant="compact"`) :
   ```ts
   interface OutputPanelCompactProps extends OutputPanelProps {
     variant: "compact";
     presetLabel: string;
     side: "A" | "B";
     vs?: ScenarioOutput | null; // référence pour les deltas
   }
   ```

3. **Différenciation comportementale** :
   - **Full** (`lab-shell.tsx`) : garde TOUT le contenu actuel (Narrative, PTAI, NavSparkline, BTC Tactical, Rebalancing, Assumptions, Disclaimer, stacked bar). Wrapper `<Card>`.
   - **Compact** (`compare-mode.tsx`) : header scénario, APY avec delta (si `side === "B"` et `vs` fourni), Risk/Mining sans delta texte individuel (juste scores), Vault Mode, Allocation table compacte. Wrapper `glass-panel` + `glass-panel-subtle` internes. PAS de Narrative, PTAI, NavSparkline, BTC Tactical, Rebalancing, Assumptions, Disclaimer.

4. **Helpers à conserver** :
   - `AssumptionsList`, `AllocationBar` → dans `output-panel.tsx` (full only).
   - Helpers delta (`computeApyDelta`, `computeRiskDelta`, etc.) → dans `output-panel.tsx` (compact only).
   - `MODE_LABEL`, `MODE_VARIANT`, `GUARDRAIL_*` → restent dans `output-panel.tsx` si utilisés par full.

5. **Refactoring de `compare-mode.tsx`** :
   - Remplacer `import { OutputPanelCompact }` par `import { OutputPanel }`.
   - Utiliser `<OutputPanel variant="compact" side="A" presetLabel="..." output={...} />` et `<OutputPanel variant="compact" side="B" presetLabel="..." output={...} vs={outputA} />`.

6. **Refactoring de `lab-shell.tsx`** :
   - Continuer d'utiliser `<OutputPanel output={...} isPending={...} narrative={...} />` (variant full par défaut).

7. **Suppression** :
   - Supprimer `src/components/scenario/output-panel-compact.tsx`.
   - Conserver `src/components/scenario/output-panel-shared.tsx` (ne pas le fusionner, il est utile pour d'éventuels consommateurs externes).

**Contraintes non-négociables** :
1. `pnpm typecheck` passe sans erreur.
2. Aucune régression visuelle : le rendu HTML/CSS final du mode full doit être identique bit-à-bit (mêmes classes, mêmes structures).
3. Le mode compact doit préserver les deltas A/B, le layout `glass-panel`, et la densité visuelle actuelle.
4. Ne pas réintroduire de `style={{ color: ... }}` inline — utiliser les classes existantes (`bg-current`, etc.).
5. Si possible, extraire les sous-sections réutilisables (ex: `ApyHeroSection`, `RiskMiningSection`) en fonctions internes au fichier pour réduire la duplication entre full et compact, MAIS sans créer de nouveaux fichiers séparés inutiles.

**Vérification finale** :
```bash
pnpm typecheck
# S'assurer que output-panel-compact.tsx n'existe plus
ls src/components/scenario/output-panel-compact.tsx # doit échouer
```
