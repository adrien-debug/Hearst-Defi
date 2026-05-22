# Prompt 1 — S2-9 : Harmonisation radius

Copie-colle ce bloc **intégralement** dans Claude :

---

Tu es un développeur frontend senior sur un projet Next.js + Tailwind + TypeScript (Hearst DeFi).

**Objectif** : Remplacer TOUTES les occurrences de variables CSS `--radius-*` non-CT par leur équivalent `--ct-radius-*` directement dans les fichiers de `src/`.

**Mapping officiel** (basé sur `globals.css`) :
- `--radius-sm` → `--ct-radius-sm`
- `--radius-md` → `--ct-radius-md`
- `--radius-lg` → `--ct-radius-lg`
- `--radius-xl` → `--ct-radius-xl`
- `--radius-2xl` → `--ct-radius-xl`
- `--radius-full` → `--ct-radius-full`
- `--radius-card` → `--ct-radius-lg`
- `--radius-button` → `--ct-radius-full`
- `--radius-modal` → `--ct-radius-xl`
- `--radius-input` → `--ct-radius-md`

**Fichiers concernés** (30 occurrences totales) :
- `src/components/proof-center/por-summary.tsx`
- `src/components/proof-center/contracts-audit-trail.tsx`
- `src/components/proof-center/event-timeline.tsx`
- `src/components/dashboard/timeseries-section.tsx`
- `src/components/scenario/rebalancing-actions.tsx`
- `src/components/scenario/backtest-panel.tsx`
- `src/components/scenario/lab-shell.tsx`
- `src/components/scenario/output-panel.tsx`
- `src/components/scenario/compare-mode.tsx`
- `src/components/memo/memo-section.tsx`

**Contraintes non-négociables** :
1. Ne toucher à AUCUN autre token ou style.
2. Garder exactement les mêmes classes Tailwind (`rounded-[...]`).
3. Ne PAS toucher à `globals.css` (les alias peuvent rester pour compatibilité externe).
4. Après modification, `pnpm typecheck` doit passer sans erreur.
5. Vérifier visuellement que les composants concernés n'ont pas de régression de `border-radius`.

**Vérification finale** :
```bash
# Doit retourner 0 résultat
grep -r "\-\-radius-" src/ | grep -v "ct-radius"
pnpm typecheck
```
