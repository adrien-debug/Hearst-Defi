# Hearst Connect — Déploiement & Rollback

## Plateforme cible

**Railway** (build via `Dockerfile` multi-stage, exécution sur conteneur Docker).

Le fichier `railway.toml` configure Railway pour utiliser le `Dockerfile` à la racine du projet et expose un healthcheck sur `/api/health`.

## Prérequis

- **Node.js** ≥ 22 (voir `engines` dans `package.json`)
- **pnpm** ≥ 10
- **Railway CLI** (optionnel, pour déploiement manuel) :
  ```bash
  npm install -g @railway/cli
  ```

## Déploiement automatique (CD)

Le workflow `.github/workflows/deploy.yml` se déclenche à chaque `push` sur la branche `main` :

1. Lint + Typecheck
2. Tests (Vitest)
3. Build production (`pnpm run build`)
4. Déploiement sur Railway (`railway up`)

## Déploiement manuel

Si vous préférez déployer depuis votre machine locale (déjà liée au projet Railway) :

```bash
# Assurez-vous d'être sur main et à jour
git checkout main && git pull origin main

# Déployer le répertoire courant sur Railway
railway up
```

Pour cibler un service ou un projet spécifique :

```bash
railway up --project <PROJECT_ID> --service <SERVICE_NAME> --ci
```

## Procédure de rollback

Railway ne fournit pas de commande CLI native `rollback`. Voici les méthodes possibles :

### 1. Rollback via le Dashboard (recommandé)

1. Ouvrez le projet sur [railway.app](https://railway.app).
2. Naviguez vers l'onglet **Deployments** du service.
3. Cliquez sur les trois points (`…`) à droite du déploiement souhaité.
4. Sélectionnez **Rollback**.

> Le rollback restaure à la fois l'image Docker et les variables d'environnement du déploiement cible.

### 2. Rollback via Git (recommandé en cas d'erreur de code)

```bash
# Identifiez le commit à restaurer
git log --oneline

# Revert le commit problématique
git revert <COMMIT_HASH>

# Poussez sur main — le workflow CD déclenchera un nouveau déploiement
git push origin main
```

### 3. Suppression du dernier déploiement (urgence)

```bash
# Supprime le déploiement le plus récent (arrête le service)
railway down
```

> **Attention** : `railway down` ne fait pas un "rollback" vers un état précédent — il supprime simplement le dernier déploiement. Le service reste arrêté jusqu'au prochain `railway up`.

## Variables d'environnement requises en production

Les variables suivantes **doivent être configurées** dans le dashboard Railway (Settings → Variables). Aucune valeur sensible ne doit être versionnée.

### Obligatoires

- `DATABASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `INNGEST_SIGNING_KEY`

### Build-time (inline par Next.js)

- `NEXT_PUBLIC_PRIVY_APP_ID`
- `NEXT_PUBLIC_CHAIN_RPC_URL`
- `NEXT_PUBLIC_EVENT_LOGGER_ADDRESS`
- `NEXT_PUBLIC_POR_REGISTRY_ADDRESS`
- `NEXT_PUBLIC_SENTRY_DSN`

### Observabilité (Sentry)

- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

### Intégrations tierces

- `PRIVY_APP_SECRET`
- `HYPERCLI_API_KEY`
- `FIREBLOCKS_API_KEY`
- `FIREBLOCKS_SECRET_KEY_PATH`
- `FIREBLOCKS_BASE_URL`
- `FIREBLOCKS_VAULT_ACCOUNT_IDS`
- `INNGEST_EVENT_KEY`

### Administration & provisioning

- `ADMIN_EMAILS`
- `ADMIN_INITIAL_PASSWORD`
- `ADMIN_ADDRESSES`
- `HEARST_PUBLISHER`

### LLM / Hypercli

- `HYPERCLI_BASE_URL`
- `HYPERCLI_DEFAULT_MODEL`
- `HYPERCLI_ORG_ID`

### Divers

- `LOG_LEVEL`
- `DEMO_MODE_DEFAULT`

## Healthcheck

```
GET /api/health
```

Railway utilise cet endpoint pour valider que le conteneur est prêt à recevoir du trafic. Le timeout est configuré à **30 secondes** dans `railway.toml`.

---

## Backups & PITR (Point-In-Time Recovery)

### Railway Postgres

Railway active **les backups quotidiens automatiques** sur les instances Postgres managées (rétention 7 jours sur le plan Hobby, jusqu'à 30 jours sur Pro). À vérifier dans le dashboard :

1. Railway → projet → service Postgres → onglet **Settings** → section **Backups**.
2. Confirmer que **Daily backup** est ON.
3. Sur plan Pro, activer **Point-In-Time Recovery (PITR)** pour rollback granulaire (toute timestamp jusqu'à 7 jours).

### Procédure de restauration DB

1. Dashboard Railway → service Postgres → **Backups** → sélectionner le backup cible.
2. **Restore** crée une nouvelle instance Postgres (ne remplace pas l'actuelle).
3. Mettre à jour `DATABASE_URL` du service applicatif pour pointer vers la nouvelle instance.
4. Redéployer (`railway up`) ou attendre le prochain healthcheck.

### Snapshot manuel avant changement schema

Avant tout `db push` à risque (drop colonne, type change), faire un snapshot manuel :

```bash
# Depuis votre machine, avec psql installé
pg_dump "$DATABASE_URL_PROD" --no-owner --no-acl > backup-$(date +%Y%m%d-%H%M%S).sql
```

Stocker hors-repo (S3, Drive, etc.). **Ne jamais versionner un dump SQL.**

### Migrations vs `db push` — implications rollback

Le pipeline utilise `prisma db push` (state-driven, voir `.github/workflows/deploy.yml` commentaire) plutôt que `prisma migrate deploy`. Conséquence : **pas d'historique versionné des changements de schema en production**. Le rollback DB se fait donc par restauration backup, pas par migration inverse.

Pour une vraie traçabilité, l'évolution future est de :

1. Générer un set de migrations Postgres dédié (`prisma migrate dev` contre une DB locale Postgres).
2. Switcher `migration_lock.toml` vers `postgresql`.
3. Remplacer `db push` par `migrate deploy` dans `deploy.yml`.

---

## Alerting (Sentry)

Sentry capte les exceptions runtime côté client + serveur + edge (`sentry.{client,server,edge}.config.ts`). Pour transformer ces captures en notifications :

1. Sentry dashboard → projet `hearst-connect` → **Alerts** → **Create Alert Rule**.
2. Règles recommandées (minimum viable) :

   | Nom | Condition | Action |
   |---|---|---|
   | High error rate | `count > 10 in 5 min` | Webhook Discord/Slack |
   | New issue | `is:new` | Email on-call |
   | Latency p95 spike | `transaction.duration > 3s for 5 min` | Webhook |
   | Rate-limit breach | `tag:rate_limit count > 5 in 1 min` | Webhook |

3. Pour PagerDuty/Opsgenie : Sentry → **Settings** → **Integrations** → connecter le provider, puis assigner aux rules ci-dessus.

4. **Sourcemap upload** : déjà géré au build CI (`SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` dans `deploy.yml`). Vérifier les uploads dans Sentry → **Settings** → **Source Maps**.

---

## Manual approval gate (production)

Le job `deploy` du workflow `.github/workflows/deploy.yml` est rattaché à l'environnement GitHub **`production`**. Pour activer le gate manuel :

1. Repo GitHub → **Settings** → **Environments** → **New environment** → nommer `production`.
2. Cocher **Required reviewers** et lister les approbateurs (ex: `adrien-debug`).
3. (Optionnel) **Wait timer** : 5 min de cooling-off entre approval et démarrage du job.
4. (Optionnel) **Deployment branches** : restreindre à `main` uniquement.

Sans environment `production` créé côté GitHub, le job s'exécute sans gate (comportement identique à avant l'ajout).

---

## Pre-deploy checklist (avant `git push origin main`)

- [ ] Tests locaux verts : `pnpm typecheck && pnpm lint && pnpm test`
- [ ] Build local OK : `pnpm build`
- [ ] Migrations Prisma : si schema modifié, snapshot DB prod via `pg_dump` (voir Backups & PITR).
- [ ] Secrets Railway à jour (Settings → Variables) — checklist au-dessus.
- [ ] Secret GitHub `DATABASE_URL` provisionné (sinon job `Apply database schema` exit 1).
- [ ] Sentry alert rules actives (voir Alerting).
- [ ] Approbateur disponible pour le gate `production` (si configuré).

---

## Provisioning des secrets GitHub Actions

Secrets requis dans `Settings → Secrets and variables → Actions` :

```bash
# Via gh CLI (depuis votre poste avec gh authentifié)
gh secret set DATABASE_URL --body "postgresql://user:pass@host:5432/dbname"
gh secret set RAILWAY_TOKEN --body "..."
gh secret set RAILWAY_PROJECT_ID --body "..."
gh secret set RAILWAY_SERVICE_NAME --body "..."

# Build-time NEXT_PUBLIC_*
gh secret set NEXT_PUBLIC_PRIVY_APP_ID --body "..."
gh secret set NEXT_PUBLIC_CHAIN_RPC_URL --body "..."
gh secret set NEXT_PUBLIC_EVENT_LOGGER_ADDRESS --body "..."
gh secret set NEXT_PUBLIC_POR_REGISTRY_ADDRESS --body "..."
gh secret set NEXT_PUBLIC_SENTRY_DSN --body "..."

# Sentry sourcemap upload
gh secret set SENTRY_ORG --body "..."
gh secret set SENTRY_PROJECT --body "..."
gh secret set SENTRY_AUTH_TOKEN --body "..."
```

Les secrets sont scopés au repo ; pour multi-environnements, utiliser les **Environment secrets** (au lieu de Repository secrets) et rattacher au `environment: production` du job `deploy`.
