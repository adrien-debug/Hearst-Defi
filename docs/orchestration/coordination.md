# Agent Coordination — Hearst Connect

**Contexte (2026-05-22)** : deux agents travaillent en parallèle sur `main`, working tree partagé.
Ce doc est le contrat qui évite que ça casse. Source de l'incident : un `git add -A` d'un agent a
embarqué les fichiers stagés de l'autre dans son commit.

## Périmètres (zéro fichier partagé)

| Agent | Possède | Ne touche jamais |
|---|---|---|
| **UI** | `src/components/**`, `src/app/**` (style, layout, `globals.css`) | `src/lib/**`, `prisma/**`, `contracts/**` |
| **Backend** (Claude orchestrateur) | `src/lib/**`, `prisma/**`, `contracts/**`, `docs/**`, fichiers **neufs** | un fichier `src/components`/`src/app` **déjà modifié** par l'UI |

Avant de toucher un fichier `src/components` ou `src/app` : `git status` d'abord. S'il est en WIP par
l'autre agent → ne pas y toucher (différer ou créer un fichier neuf).

## Règles git (les DEUX agents)

1. **Jamais `git add -A` ni `git commit -am`.** Toujours `git add <chemins explicites>`.
2. **`add` + `commit` dans la même commande** (atomique). Ne jamais laisser des fichiers stagés entre
   deux étapes — c'est la fenêtre où l'autre agent les avale.
3. **Committer chaque unité terminée immédiatement.** Fenêtre non-committée minimale.
4. **`main` uniquement.** Pas de branche, pas de `reset`/`rebase`/`force-push` (réécrit l'historique
   partagé → perte).

## Roadmap séquencée (anti-collision)

- **Track 1 — Backend greenfield** (Claude, maintenant, 0 collision) : tout en `src/lib`/`prisma`,
  fichiers neufs. → `advanced-metrics`, `lp-portal` (data layer), `share-class` (schema + règles).
- **Track 2 — Wiring data→UI** (coordonné) : badge « Attested · vérifié » dans le Proof Center,
  timeseries 36 mois sur le dashboard. Backend fournit la donnée (data layer/props) + composants
  **neufs** ; l'insertion dans une page existante = point unique, fait quand le fichier est clean.
- **Track 3 — Bloqué (wallet)** : `sc-event-logger`, `sc-por-registry`, `proof-center-wire`
  (déploiement Base Sepolia — nécessite clé + ETH testnet).
