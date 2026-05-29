# SYSTEMIC RISK AUDIT — Hearst Connect

**Date:** 2026-05-29  
**Auditor:** Kimi Code CLI (systemic analysis)  
**Scope:** Code, Infrastructure, People, Operations, Governance, Custody, Compliance, Vendors, Data, Oracles, Reporting, Legal  
**Method:** Static analysis of 595 TS/TSX files, 551 Solidity files, Prisma schema (831 lines), 54 markdown docs, CI/CD, configs, env files. No runtime testing. No social engineering.  
**Freeze context:** Pre-Spearbit audit (contracts frozen at SHA `898991c6`), testnet-only deployment, MVP status.

---

# PARTIE 1 — SINGLE POINTS OF FAILURE (SPOF)

## 1.1 SPOF Techniques

| # | SPOF | Impact | Probabilité | Mitigation existante |
|---|------|--------|-------------|---------------------|
| T1 | **Railway (unique hosting provider)** | Total service outage, no geo-redundancy | Moyenne (PaaS failures happen) | Aucune multi-cloud. Rollback manuel via dashboard. Healthcheck `/api/health` 30s timeout. |
| T2 | **Base Sepolia RPC (Alchemy free tier)** | `eth_getLogs` échoue silencieusement → Proof Center vide. Deposit/withdrawal impossibles si RPC down. | Élevée (free tier = pas de SLA) | Fallback vers `sepolia.base.org` public. Pas de RPC backup payant configuré. |
| T3 | **SQLite en local dev → Postgres en prod (mismatch dialect)** | `db push` state-driven sans migrations versionnées. Rollback DB = restore backup, pas de migration inverse. | Moyenne | Backups quotidiens Railway (7-30j). PITR sur plan Pro. Pas de migration lock PostgreSQL. |
| T4 | **Prisma provider switch (`scripts/prisma-provider.mjs`)** | Si le script échoue en CI, build utilise SQLite en prod = crash immédiat. | Faible | Script simple mais critique. Pas de test dédié du script en CI. |
| T5 | **Single Next.js instance (pas de cluster)** | Pas de horizontal scaling. Rate limiting Redis dépend d'une seule instance Upstash. | Moyenne | Redis Upstash distribué. Mais l'app elle-même est single-instance Railway. |
| T6 | **No `ReentrancyGuard` sur le vault ERC-4626** | Si USDC devient callback-enabled (upgrade Circle), reentrancy possible sur deposit/withdraw. | Faible (USDC stable) | Posture documentée: "USDC est non-callback, donc pas besoin". Pas de guard défensif. |
| T7 | **Hardcoded USDC address (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`)** | Si USDC est redeployé/mis à jour sur Base Sepolia, toutes les transactions échouent. | Faible | Adresse canonique Base Sepolia. Pas de mécanisme de détection de changement. |
| T8 | **Electron app (desktop) mono-canal** | Si le build Electron échoue ou est compromis, pas d'alternative web pour les ops. | Faible | App web Next.js disponible. Mais le desktop est le canal "institutionnel" promu. |
| T9 | **Single LLM provider (Hypercli / Kimi K2.6)** | Tous les agents (investor memo, scenario narrative, mining health, cockpit chat) tombent si Hypercli est down. | Moyenne | Fallback model `glm-5` configurable. Circuit breaker implémenté. Mais pas de provider alternatif (OpenAI, Anthropic). |
| T10 | **Inngest (unique job queue)** | Background jobs (mining health, investor memo, distributions) bloqués si Inngest down. | Moyenne | Signing key requis en prod. Pas de queue backup (pas de BullMQ, pas de SQS). |
| T11 | **Sentry (unique observability)** | Pas d'alerting si Sentry down. Pas de monitoring alternatif (Datadog, Grafana). | Faible | Sentry DSN + auth token. Pas de monitoring infrastructure (CPU, mémoire, disque). |
| T12 | **No database replication / read replicas** | Toutes les requêtes DB passent par l'instance Railway unique. Pas de failover. | Moyenne | Railway Postgres managé avec backups. Pas de multi-AZ explicite. |

## 1.2 SPOF Humains

| # | SPOF | Impact | Probabilité | Mitigation existante |
|---|------|--------|-------------|---------------------|
| H1 | **Founder/CEO (Adrien) — bus factor ≈ 1** | Toutes les décisions critiques passent par une seule personne. Safe 3/5 signers non identifiés publiquement. | Élevée | Safe 3/5 en théorie. Mais le déploiement, les secrets GitHub, les accès Railway, Fireblocks, Persona = contrôlés par le founder. |
| H2 | **Single engineer principal** | 595 fichiers TS/TSX maintenus par ~1 développeur. Aucune revue de code systématique. | Élevée | CI lint + typecheck + 1758 tests Vitest. Mais pas de PR review obligatoire documentée. |
| H3 | **Safe 3/5 signers — pas de backup signers identifiés** | Si 3 signers sont indisponibles (vacances, maladie, départ), le timelock 48h bloque TOUTE gouvernance. | Moyenne | Cancel quorum = 1 (n'importe quel signer peut bloquer). Mais pas de procédure de remplacement de signer documentée. |
| H4 | **Guardian key — single fast-response key** | Si le guardian est compromis ou perd sa clé, le vault peut être pausé indéfiniment (griefing) ou rester vulnérable. | Moyenne | Guardian rotatable par owner (48h timelock). Mais pas de procédure de rotation d'urgence documentée. |
| H5 | **No ops team / no on-call rotation** | Incident à 3h du matin = personne pour réagir. Pas de runbook d'incident. | Élevée | Sentry alerts configurables. Pas de PagerDuty/Opsgenie connecté. Pas de runbook. |
| H6 | **No compliance officer dédié** | KYC/AML, accréditation investor, LPA/PPM = gérés par le founder ou externalisés ad-hoc. | Élevée | Persona pour KYC. DocuSign pour signatures. Mais pas de compliance officer identifié. |
| H7 | **No legal counsel onboardé (Cayman SPV)** | ADR-001 mentionne Maples/Walkers comme cibles. Pas de confirmation de counsel retenu. | Élevée | Structure Cayman ELP choisie. Pas de documents légaux produits dans le repo. |

## 1.3 SPOF Opérationnels

| # | SPOF | Impact | Probabilité | Mitigation existante |
|---|------|--------|-------------|---------------------|
| O1 | **Fireblocks — custody unique (Viewer key read-only)** | Si Fireblocks est down/compromis, pas de PoR live. Pas d'accès aux réserves pour les ops. | Moyenne | Fallback `manual` en cas d'erreur. Mais pas de custody backup (pas de second custodian). |
| O2 | **Persona — KYC unique** | Si Persona down, onboarding LP bloqué. Si Persona compromis, faux KYC possibles. | Moyenne | Pas de KYC backup. Pas de vérification manuelle documentée. |
| O3 | **DocuSign — subscription agreements unique** | Si DocuSign down, LP ne peut pas signer les documents légaux. | Faible | Pas de fallback (pas de HelloSign, pas de signature papier numérisée). |
| O4 | **Mining partner unique (revenue-share)** | Si le partner fait faillite, triche, ou est saisi — aucun yield. | Élevée | ADR-003: 1-2 farms prévus. Mais pas de partner identifié dans le repo. Pas de diversification. |
| O5 | **No withdrawal queue / no gate** | Tous les LPs peuvent redeem simultanément. Pas de mécanisme de gate, de notice period, ou de suspension sélective. | Élevée | `pause()` bloque TOUTES les sorties (y compris les innocentes). Pas de queue. |
| O6 | **Yield injection manuelle (manager transfer USDC)** | Si le manager oublie, est malade, ou disparaît — pas de yield. Pas de yield automatique. | Élevée | Process off-chain (Fireblocks/SPV). Pas de smart contract de yield automatique. Pas de fallback si manager indisponible. |
| O7 | **Distribution manuelle (pas de mécanisme on-chain)** | Les distributions sont calculées off-chain et exécutées manuellement. Risque d'erreur humaine. | Élevée | `Distribution` model en DB + `DistributionApproval` pour multisig. Mais pas de mécanisme on-chain de distribution automatique. |
| O8 | **No disaster recovery plan documenté** | Pas de DRP, pas de BCP, pas de RTO/RPO définis. | Élevée | Backups DB. Pas de documentation DR. Pas de tests de restauration. |
| O9 | **Pas de séparation des environnements (dev/staging/prod)** | Même codebase, même DB schema. `db push` en prod sans staging gate. | Élevée | GitHub environment `production` avec approbation manuelle. Mais pas d'environnement staging dédié. |
| O10 | **Secrets management — GitHub Secrets + Railway env vars** | Tous les secrets dans deux systèmes. Pas de Vault (HashiCorp, AWS Secrets Manager). Pas de rotation automatique. | Moyenne | GitHub secrets scopés. Railway variables. Pas de secret scanning en CI. |

## 1.4 SPOF Réglementaires

| # | SPOF | Impact | Probabilité | Mitigation existante |
|---|------|--------|-------------|---------------------|
| R1 | **Cayman ELP — pas de counsel confirmé, pas de documents** | Pas de PPM, pas de LPA, pas de subscription agreement finalisé. = pas de cadre légal pour accepter des fonds. | Élevée | ADR-001. Pas de documents dans le repo. Pas de confirmation de counsel. |
| R2 | **Reg D 506(c) / Reg S — pas de structure US** | Si un LP US non-accrédité investit = violation SEC. Pas de vérification d'accréditation automatisée. | Élevée | Checkbox d'accréditation à l'onboarding (self-attested). Pas de vérification tierce (VerifyInvestor, etc.). |
| R3 | **AML/KYC — Persona seule, pas de screening sanctions (OFAC, UN)** | Si un LP sanctionné passe Persona = compliance failure. | Moyenne | Persona a PEP/sanctions screening (module payant). Pas de confirmation qu'il est activé. |
| R4 | **Pas de licence MSB / VASP** | Si la juridiction d'opération (France ? UAE ?) exige une licence = fermeture. | Moyenne | Pas de mention de licence dans les docs. Entité: "Hearst DeFi SARL" ? Juridiction non claire. |
| R5 | **Tax reporting — pas de K-1, pas de partner statement** | LPs institutionnels exigent des documents fiscaux. Pas de système de reporting fiscal. | Élevée | Mentionné dans ADR-001 comme "follow-up". Pas implémenté. |
| R6 | **Pas de registre des risques (risk register) institutionnel** | Pas de documentation pour les due diligence des LPs. Pas de SOC 2, pas d'ISO 27001. | Élevée | Audit Spearbit prévu (smart contracts uniquement). Pas d'audit opérationnel ou de sécurité. |

---

# PARTIE 2 — FAILURE SCENARIOS (20 scénarios catastrophe)

## Scénario 1 — Fireblocks Down
**Déclencheur:** Fireblocks indisponible > 24h (maintenance, incident, suspension compte).  
**Impact:** Pas de PoR live. Pas d'accès aux réserves USDC pour les ops. Proof Center passe en `manual`.  
**Conséquence LP:** Les LPs voient "no attestation" — panique potentielle. Pas de preuve de solvabilité.  
**Mitigation actuelle:** Fallback `manual` (valeurs à 0). Pas de custody backup.  
**Gravité:** 🔴 CRITIQUE

## Scénario 2 — Persona Down
**Déclencheur:** Persona incident majeur ou suspension du compte Hearst.  
**Impact:** Onboarding LP bloqué. Pas de nouveaux investisseurs. KYC existants perdent leur statut si refresh requis.  
**Conséquence LP:** LP potentiels ne peuvent pas s'inscrire.  
**Mitigation actuelle:** Aucune. Pas de KYC backup.  
**Gravité:** 🟡 ÉLEVÉE

## Scénario 3 — Oracle Failure (Chainlink BTC/USD)
**Déclencheur:** Chainlink aggregator BTC/USD stale ou manipulé.  
**Impact:** Le prix BTC utilisé pour le mining health et les scenarios est faux. Les signaux de rebalancement peuvent être incorrects.  
**Conséquence LP:** Mauvaises décisions d'allocation. Mauvaise communication dans l'investor memo.  
**Mitigation actuelle:** Fallback à un prix manuel. Pas de multi-oracle (pas de Coinbase, pas de Binance).  
**Gravité:** 🟡 ÉLEVÉE

## Scénario 4 — Mining Partner Failure
**Déclencheur:** Le partner minier fait faillite, est saisi, ou cesse de payer.  
**Impact:** Zéro yield injecté dans le vault. NAV stagne. LPs reçoivent 0% au lieu de 9-12%.  
**Conséquence LP:** Rédemption massive (flight to quality). Le vault a 100% USDC en réserve — solvable mais pas de yield.  
**Mitigation actuelle:** Aucune diversification. Pas de partner identifié. Pas de garantie.  
**Gravité:** 🔴 CRITIQUE

## Scénario 5 — Safe Signer Loss (3/5)
**Déclencheur:** 3 signers perdent leurs clés / sont indisponibles simultanément.  
**Impact:** Aucune gouvernance possible. Pas de rotation guardian. Pas de param update. Le vault est gelé dans sa configuration actuelle.  
**Conséquence LP:** Si le guardian est compromis et pause le vault, personne ne peut unpause (owner = timelock, timelock = Safe).  
**Mitigation actuelle:** Safe 3/5. Pas de procédure de recovery de signer. Pas de social recovery.  
**Gravité:** 🔴 CRITIQUE

## Scénario 6 — Compromission Admin (Founder)
**Déclencheur:** Le founder est compromis (phishing, device perdu, extorsion).  
**Impact:** Accès complet: Railway, GitHub, Fireblocks, Persona, DB, secrets. Peut modifier le code, déployer, drainer les réserves Fireblocks (off-chain), falsifier les attestations.  
**Conséquence LP:** Le vault on-chain est protégé (pas de privileged withdraw). Mais les réserves off-chain (Fireblocks/SPV) peuvent être drainées. Les attestations PoR peuvent être falsifiées.  
**Mitigation actuelle:** Safe 3/5 pour les actions on-chain. Mais pas de 2FA sur Railway. Pas de SSO. Pas de séparation des privilèges.  
**Gravité:** 🔴 CRITIQUE

## Scénario 7 — Bad Attestation (PoR falsifié)
**Déclencheur:** Publisher (Safe 3/5) publie une attestation avec des chiffres gonflés.  
**Impact:** PoRRegistry contient une fausse attestation (append-only, irréversible). Les LPs voient un AUM supérieur à la réalité.  
**Conséquence LP:** Pas d'impact direct sur les fonds (PoR est advisory). Mais confiance érodée. Pas de mécanisme de correction on-chain.  
**Mitigation actuelle:** Append-only. Pas de mécanisme de correction. Pas de vérification automatique Fireblocks ↔ on-chain.  
**Gravité:** 🟡 ÉLEVÉE

## Scénario 8 — Wrong NAV (UI bug)
**Déclencheur:** Bug frontend (P0-1 identifié en QA: NAV/share = 1.0000 quand aucune position).  
**Impact:** LPs voient une NAV incorrecte. Décisions d'investissement basées sur des données fausses.  
**Conséquence LP:** Plaintes, litiges potentiels si pertes subséquentes.  
**Mitigation actuelle:** QA manuel Playwright. 3 P0 identifiés. Pas de tests automatisés E2E en CI.  
**Gravité:** 🟡 ÉLEVÉE

## Scénario 9 — Wrong Distribution (erreur de calcul)
**Déclencheur:** Bug dans le calcul de distribution (off-chain) ou erreur humaine.  
**Impact:** LPs reçoivent trop ou pas assez. Certains LPs peuvent être privilégiés.  
**Conséquence LP:** Litiges. Régulateur potentiellement alerté.  
**Mitigation actuelle:** `DistributionApproval` avec multisig. Mais le calcul initial est off-chain, non audité.  
**Gravité:** 🔴 CRITIQUE

## Scénario 10 — LP Redemption Wave (bank run)
**Déclencheur:** Rumeur, panique marché, ou scandale. Tous les LPs redeem simultanément.  
**Impact:** Le vault a 100% USDC en réserve — solvable. Mais si le yield est "promis" et que le partner ne paie pas = pas assez de USDC pour tout le monde + yield.  
**Conséquence LP:** Les premiers redeemers sont payés. Les derniers peuvent attendre le yield injection. Pas de gate.  
**Mitigation actuelle:** `pause()` bloque tout. Pas de queue. Pas de notice period on-chain.  
**Gravité:** 🔴 CRITIQUE

## Scénario 11 — Smart Contract Exploit (Reentrancy via USDC upgrade)
**Déclencheur:** Circle upgrade USDC avec callback hooks. Attaque reentrancy sur withdraw.  
**Impact:** Draining du vault. Perte de 100% des fonds.  
**Conséquence LP:** Perte totale.  
**Mitigation actuelle:** Pas de `ReentrancyGuard`. Confiance implicite en USDC.  
**Gravité:** 🔴 CRITIQUE (probabilité faible mais impact maximal)

## Scénario 12 — Timelock Misconfiguration
**Déclencheur:** Mauvais délai, EOA admin, ou executors mal configurés au déploiement.  
**Impact:** Vault verrouillé (pas de gouvernance possible) ou vulnérable (pas de délai).  
**Conséquence LP:** Gel permanent ou attaque instantanée.  
**Mitigation actuelle:** Tests Foundry (13 tests governance). Déploiement script validé. Mais pas de vérification on-chain automatisée post-déploiement.  
**Gravité:** 🟡 ÉLEVÉE

## Scénario 13 — LLM Hallucination (Investor Memo)
**Déclencheur:** Kimi K2.6 génère un investor memo avec des projections fausses ou des promesses de rendement.  
**Impact:** Communication réglementairement sensible avec des données incorrectes.  
**Conséquence LP:** Plaintes, litiges, régulateur.  
**Mitigation actuelle:** Forbidden words list. Disclaimer "not guaranteed". Mais pas de validation humaine obligatoire avant envoi.  
**Gravité:** 🟡 ÉLEVÉE

## Scénario 14 — DB Corruption / Ransomware
**Déclencheur:** Attaque sur Railway Postgres, ou erreur `db push` destructive.  
**Impact:** Perte de toutes les données: positions, transactions, KYC, governance signatures.  
**Conséquence LP:** Impossible de prouver qui a investi combien. Litiges.  
**Mitigation actuelle:** Backups quotidiens. PITR. Pas de chiffrement DB au repos documenté.  
**Gravité:** 🔴 CRITIQUE

## Scénario 15 — CI/CD Compromise
**Déclencheur:** GitHub Actions compromise (secret leak, supply chain attack sur action).  
**Impact:** Déploiement de code malveillant. Injection de backdoor.  
**Conséquence LP:** Potentiellement tout: vol de données, vol de fonds (off-chain).  
**Mitigation actuelle:** GitHub environment `production` avec approbation manuelle. Pas de signed commits obligatoires. Pas de SLSA.  
**Gravité:** 🔴 CRITIQUE

## Scénario 16 — Privy Compromise
**Déclencheur:** Privy est compromis ou suspend le compte Hearst.  
**Impact:** Les LPs ne peuvent pas connecter leur wallet. Le flux de paiement est bloqué.  
**Conséquence LP:** Pas de nouveaux dépôts.  
**Mitigation actuelle:** Aucune. Pas de wallet connect alternatif (RainbowKit, WalletConnect standalone).  
**Gravité:** 🟡 ÉLEVÉE

## Scénario 17 — Hypercli / LLM Provider Shutdown
**Déclencheur:** Hypercli ferme, ou Kimi K2.6 est indisponible, ou quota épuisé.  
**Impact:** Tous les agents offline. Cockpit chat mort. Investor memo impossible. Scenario narrative impossible.  
**Conséquence LP:** Dégradation UX. Pas d'impact financier direct.  
**Mitigation actuelle:** Fallback `glm-5`. Circuit breaker. Pas de provider alternatif majeur.  
**Gravité:** 🟢 MOYENNE

## Scénario 18 — Base Chain Incident (L2 sequencer down, reorg)
**Déclencheur:** Sequencer Base arrêté, ou reorg massif, ou bridge compromis.  
**Impact:** Toutes les transactions on-chain bloquées. Déposits/withdrawals impossibles.  
**Conséquence LP:** Pas d'accès aux fonds pendant la durée de l'incident.  
**Mitigation actuelle:** Aucune multi-chain. Pas de bridge vers Ethereum mainnet.  
**Gravité:** 🟡 ÉLEVÉE

## Scénario 19 — DocuSign Compromise / Indisponibilité
**Déclencheur:** DocuSign down ou suspension compte.  
**Impact:** Les LP ne peuvent pas signer les subscription agreements. Onboarding bloqué.  
**Conséquence LP:** Pas de nouveaux contrats.  
**Mitigation actuelle:** Aucune. Pas de HelloSign, pas de signature manuelle.  
**Gravité:** 🟢 MOYENNE

## Scénario 20 — Regulatory Shutdown (SEC, Cayman CIMA, etc.)
**Déclencheur:** Régulateur émet un cease & desist.  
**Impact:** Obligation de stopper immédiatement les opérations. Gel des fonds.  
**Conséquence LP:** Panique. Redemptions massives. Le vault est solvable (100% USDC) mais le processus de redemption peut être bloqué par le régulateur.  
**Mitigation actuelle:** Aucune. Pas de legal counsel confirmé. Pas de structure réglementaire complète.  
**Gravité:** 🔴 CRITIQUE

---

# PARTIE 3 — OPERATIONAL MATURITY (0–10)

| Domaine | Score | Justification |
|---------|-------|---------------|
| **Governance** | 5/10 | Safe 3/5 + Timelock 48h = bonne posture on-chain. Mais: pas de procédure de remplacement de signer, pas de documentation de gouvernance, pas de conseil d'administration identifié, pas de comité d'investissement. Off-chain: signature storage dans Prisma = SPOF. |
| **Custody** | 4/10 | Fireblocks (Viewer key) = bonne pratique. Mais: pas de multi-custodian, pas de cold storage, pas de HSM, pas de key ceremony documentée. Le vault on-chain est très sécurisé (pas de privileged withdraw) mais les réserves off-chain (SPV/Fireblocks) sont opaques. |
| **Security** | 4/10 | CI lint/typecheck/tests. Pas de secret scanning. Pas de SAST/DAST. Pas de bug bounty. Pas de penetration test. Pas de SOC 2. Pas d'ISO 27001. Pas de WAF. Pas de DDoS protection documentée. Auth: email/password + TOTP (optionnel) = basique. Pas de SSO/SAML. |
| **Compliance** | 2/10 | Persona pour KYC (module basique). Pas de PEP/sanctions screening confirmé. Pas de AML monitoring. Pas de transaction monitoring. Pas de SAR filing process. Pas de compliance officer. Pas de PPM/LPA finalisé. Accréditation = self-attested checkbox. |
| **Reporting** | 3/10 | PoRRegistry + EventLogger on-chain (advisory). Pas de reporting financier standard (GAAP, IFRS). Pas de NAV indépendant. Pas d'audit annuel. Pas de K-1. Pas de partner statement. Investor memo généré par LLM = pas de validation humaine obligatoire. |
| **Incident Response** | 2/10 | Pas de runbook. Pas de playbooks. Pas d'on-call rotation. Pas de war room process. Pas de communication crisis plan. Sentry pour alerting mais pas de règles actives confirmées. Pas de post-mortem template. |
| **Vendor Management** | 3/10 | Fireblocks, Persona, DocuSign, Hypercli, Inngest, Sentry, Railway, Privy identifiés. Mais: pas de due diligence documentée, pas de SLA review, pas de vendor risk assessment, pas de plan de sortie (exit plan), pas de backup vendors. |
| **Monitoring** | 3/10 | Sentry (errors). Pas de monitoring infrastructure (CPU, RAM, disque). Pas de monitoring business (AUM, nombre de LPs, redemption rate). Pas de monitoring on-chain (vault TVL, gas, failed transactions). Pas de alerting sur les smart contracts (Forta, Tenderly). |

---

# PARTIE 4 — INSTITUTIONAL READINESS

## 4.1 10 LPs
**Verdict:** 🟡 Possible avec friction majeure
- Le vault on-chain est solvable et sécurisé (pas de privileged withdraw).
- Mais: KYC manuel ad-hoc, pas de PPM/LPA, pas de reporting fiscal, pas de compliance officer.
- Chaque LP nécessitera une due diligence qui révélera les lacunes.
- **Conclusion:** Le système peut techniquement gérer 10 LPs, mais pas de manière institutionnellement acceptable.

## 4.2 50 LPs
**Verdict:** 🔴 Non
- Pas de scaling opérationnel: distributions manuelles, reporting manuel, KYC manuel.
- Pas de ségrégation des rôles: le founder fait tout (custody, compliance, reporting, ops).
- Pas de structure juridique complète: risque réglementaire majeur.
- Pas de disaster recovery: une erreur DB = perte de 50 relations LP.
- **Conclusion:** Le système s'effondre sous le poids opérationnel avant 50 LPs.

## 4.3 100 LPs
**Verdict:** 🔴 Non
- Tous les problèmes de 50 LPs, amplifiés.
- Pas de multi-signature opérationnelle à l'échelle.
- Pas de gestion de cas compliance (PEP, sanctions, source of funds).
- Pas de customer support infrastructure.
- **Conclusion:** Le système n'est pas conçu pour 100 LPs. Ce serait une catastrophe opérationnelle et réglementaire.

---

# PARTIE 5 — RISK REGISTER (TOP 100)

| ID | Description | Impact | Probability | Severity |
|----|-------------|--------|-------------|----------|
| R001 | Founder bus factor = 1 (tous les accès, toutes les décisions) | 🔴 Critique | Élevée | 🔴 CRITICAL |
| R002 | Pas de structure juridique complète (PPM/LPA/Cayman SPV) | 🔴 Critique | Élevée | 🔴 CRITICAL |
| R003 | Mining partner unique non identifié / pas de contrat | 🔴 Critique | Élevée | 🔴 CRITICAL |
| R004 | Pas de compliance officer / pas de programme AML | 🔴 Critique | Élevée | 🔴 CRITICAL |
| R005 | Pas de privileged withdraw on-chain = OK, mais yield injection manuelle = SPOF opérationnel | 🔴 Critique | Élevée | 🔴 CRITICAL |
| R006 | Pas de withdrawal queue / gate / notice period | 🔴 Critique | Élevée | 🔴 CRITICAL |
| R007 | Pas de disaster recovery plan / pas de BCP | 🔴 Critique | Élevée | 🔴 CRITICAL |
| R008 | Pas de runbook incident / pas d'on-call | 🔴 Critique | Élevée | 🔴 CRITICAL |
| R009 | Railway single-instance / pas de multi-cloud | 🔴 Critique | Moyenne | 🔴 CRITICAL |
| R010 | DB Postgres single-instance / pas de replication | 🔴 Critique | Moyenne | 🔴 CRITICAL |
| R011 | Founder compromise = accès total (GitHub, Railway, Fireblocks, secrets) | 🔴 Critique | Moyenne | 🔴 CRITICAL |
| R012 | Safe 3/5 signer loss (3+ signers indisponibles) | 🔴 Critique | Moyenne | 🔴 CRITICAL |
| R013 | Smart contract exploit (reentrancy si USDC upgrade) | 🔴 Critique | Faible | 🔴 CRITICAL |
| R014 | CI/CD compromise (GitHub Actions supply chain) | 🔴 Critique | Faible | 🔴 CRITICAL |
| R015 | DB corruption / ransomware / `db push` destructif | 🔴 Critique | Faible | 🔴 CRITICAL |
| R016 | Regulatory shutdown (SEC, CIMA, etc.) | 🔴 Critique | Moyenne | 🔴 CRITICAL |
| R017 | Pas de reporting financier standard (GAAP/IFRS) | 🔴 Critique | Élevée | 🔴 CRITICAL |
| R018 | Pas d'audit annuel / pas de NAV indépendant | 🔴 Critique | Élevée | 🔴 CRITICAL |
| R019 | Pas de tax reporting (K-1, partner statement) | 🔴 Critique | Élevée | 🔴 CRITICAL |
| R020 | Distribution manuelle = risque d'erreur humaine | 🔴 Critique | Élevée | 🔴 CRITICAL |
| R021 | Pas de custody backup (Fireblocks unique) | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R022 | Persona unique / pas de KYC backup | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R023 | RPC Base Sepolia free tier / pas de SLA | 🟡 Élevé | Élevée | 🟡 HIGH |
| R024 | Pas de monitoring on-chain (Forta, Tenderly) | 🟡 Élevé | Élevée | 🟡 HIGH |
| R025 | Pas de monitoring infrastructure | 🟡 Élevé | Élevée | 🟡 HIGH |
| R026 | LLM hallucination dans investor memo / communications LP | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R027 | Bad attestation (PoR falsifiée) — append-only = irréversible | 🟡 Élevé | Faible | 🟡 HIGH |
| R028 | Wrong NAV (UI bug identifié P0-1) | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R029 | Wrong distribution (calcul off-chain non audité) | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R030 | Base chain incident (sequencer down, reorg) | 🟡 Élevé | Faible | 🟡 HIGH |
| R031 | Timelock misconfiguration au déploiement | 🟡 Élevé | Faible | 🟡 HIGH |
| R032 | Guardian key compromise / loss | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R033 | Privy indisponible / suspension | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R034 | Inngest down = background jobs bloqués | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R035 | Hypercli down / quota épuisé = tous les agents offline | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R036 | Pas de SSO / auth email+password basique | 🟡 Élevé | Élevée | 🟡 HIGH |
| R037 | Pas de 2FA obligatoire pour les admins | 🟡 Élevé | Élevée | 🟡 HIGH |
| R038 | Pas de secret rotation automatique | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R039 | Pas de secret scanning en CI | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R040 | SQLite/Postgres dialect mismatch = risque de corruption schema | 🟡 Élevé | Faible | 🟡 HIGH |
| R041 | Pas de staging environment | 🟡 Élevé | Élevée | 🟡 HIGH |
| R042 | `db push` en prod sans migration lock PostgreSQL | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R043 | Pas de WAF / DDoS protection | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R044 | Pas de SAST/DAST | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R045 | Pas de penetration test | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R046 | Pas de bug bounty | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R047 | Pas de SOC 2 / ISO 27001 | 🟡 Élevé | Élevée | 🟡 HIGH |
| R048 | Pas de vendor risk assessment | 🟡 Élevé | Élevée | 🟡 HIGH |
| R049 | Pas de SLA review avec les vendors | 🟡 Élevé | Élevée | 🟡 HIGH |
| R050 | Pas de exit plan vendors | 🟡 Élevé | Élevée | 🟡 HIGH |
| R051 | Single engineer principal (595 fichiers) | 🟡 Élevé | Élevée | 🟡 HIGH |
| R052 | Pas de code review obligatoire | 🟡 Élevé | Élevée | 🟡 HIGH |
| R053 | Pas de signed commits | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R054 | Pas de SLSA / supply chain security | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R055 | Electron app = surface d'attaque supplémentaire | 🟡 Élevé | Faible | 🟡 HIGH |
| R056 | Demo mode (`DEMO_MODE_DEFAULT`) peut être activé par erreur | 🟡 Élevé | Faible | 🟡 HIGH |
| R057 | `ATTESTATION_DEV_ACCEPT_ANY` peut leak en prod | 🟡 Élevé | Faible | 🟡 HIGH |
| R058 | `DEV_AUTH_BYPASS` peut leak en prod (mais double-gated) | 🟡 Élevé | Faible | 🟡 HIGH |
| R059 | Pas de rate limiting sur les routes API sensibles (toutes?) | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R060 | `eth_getLogs` Alchemy free tier limit = Proof Center vide | 🟡 Élevé | Élevée | 🟡 HIGH |
| R061 | Oracle Chainlink BTC/USD unique / pas de multi-oracle | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R062 | Mining energy cost = override manuel (`MINING_ENERGY_COST_USD_PER_KWH`) | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R063 | Risk-free rate = fallback manuel 4.5% | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R064 | Pas de business monitoring (AUM, LP count, redemption rate) | 🟡 Élevé | Élevée | 🟡 HIGH |
| R065 | Pas de crisis communication plan | 🟡 Élevé | Élevée | 🟡 HIGH |
| R066 | Pas de insurance (cyber, D&O, E&O) | 🟡 Élevé | Élevée | 🟡 HIGH |
| R067 | Pas de escrow / pas de third-party fund administrator | 🟡 Élevé | Élevée | 🟡 HIGH |
| R068 | Pas de independent director / pas de board | 🟡 Élevé | Élevée | 🟡 HIGH |
| R069 | Pas de investment committee | 🟡 Élevé | Élevée | 🟡 HIGH |
| R070 | Pas de risk committee | 🟡 Élevé | Élevée | 🟡 HIGH |
| R071 | Accréditation LP = self-attested (pas de vérification tierce) | 🟡 Élevé | Élevée | 🟡 HIGH |
| R072 | Pas de PEP/sanctions screening confirmé | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R073 | Pas de source of funds verification | 🟡 Élevé | Élevée | 🟡 HIGH |
| R074 | Pas de transaction monitoring (AML) | 🟡 Élevé | Élevée | 🟡 HIGH |
| R075 | Pas de SAR filing process | 🟡 Élevé | Élevée | 🟡 HIGH |
| R076 | Pas de registre des bénéficiaires effectifs (UBO) | 🟡 Élevé | Élevée | 🟡 HIGH |
| R077 | Pas de data retention policy | 🟡 Élevé | Élevée | 🟡 HIGH |
| R078 | Pas de GDPR/privacy policy complète | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R079 | Pas de data encryption at rest documenté | 🟡 Élevé | Moyenne | 🟡 HIGH |
| R080 | Pas de data encryption in transit (hors TLS standard) | 🟡 Élevé | Faible | 🟡 HIGH |
| R081 | TOTP optionnel pour les admins (pas obligatoire) | 🟢 Moyen | Élevée | 🟢 MEDIUM |
| R082 | Password reset token = SHA256 (pas de bcrypt/argon2) | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R083 | Session cookie `hc_session` = CUID (pas de JWT signé) | 🟢 Moyen | Moyenne | 🟢 MEDIUM |
| R084 | Pas de CSP headers stricts | 🟢 Moyen | Moyenne | 🟢 MEDIUM |
| R085 | Pas de HSTS preload | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R086 | Pas de subresource integrity sur les assets externes | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R087 | `pnpm install --frozen-lockfile` mais pas de `pnpm audit` en CI | 🟢 Moyen | Moyenne | 🟢 MEDIUM |
| R088 | Pas de dependency update automation (Dependabot, Renovate) | 🟢 Moyen | Moyenne | 🟢 MEDIUM |
| R089 | Pas de license compliance check | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R090 | Pas de accessibility audit (WCAG) | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R091 | Pas de internationalisation complète (FR/EN mix) | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R092 | Pas de load testing | 🟢 Moyen | Moyenne | 🟢 MEDIUM |
| R093 | Pas de chaos engineering | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R094 | Pas de performance budget | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R095 | Pas de SEO / pas de sitemap dynamique | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R096 | Pas de analytics business (PostHog = optionnel) | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R097 | Pas de feedback loop LP structuré | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R098 | Pas de NPS / satisfaction tracking | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R099 | Pas de knowledge base / help center | 🟢 Moyen | Faible | 🟢 MEDIUM |
| R100 | Pas de succession plan (founder departure) | 🔴 Critique | Élevée | 🔴 CRITICAL |

---

# VERDICT FINAL

## **C — Prototype**

### Justification

Le système est **techniquement cohérent** et présente des qualités remarquables pour un prototype:

1. **Le vault on-chain est bien conçu:** ERC-4626 standard, pas de privileged withdraw, timelock 48h, Safe 3/5, guardian séparé. C'est une architecture de custody solide pour un prototype.
2. **La gouvernance on-chain est structurée:** Safe + Timelock + EIP-712 = bonnes pratiques DeFi institutionnelle.
3. **Le code est propre:** TypeScript strict, tests (1758 tests Vitest), lint, typecheck, documentation ADR.
4. **Les agents LLM sont intégrés** avec circuit breaker et fallback.

**MAIS** le système n'est **PAS prêt pour du pilote institutionnel**, et encore moins pour du "institution ready". Voici pourquoi:

### Ce qui manque pour être "Pilot Ready" (B):

- ❌ **Structure juridique complète:** Pas de PPM, pas de LPA, pas de Cayman SPV constitué, pas de counsel confirmé.
- ❌ **Compliance:** Pas de compliance officer, pas de programme AML, pas de PEP/sanctions screening, pas de vérification d'accréditation tierce.
- ❌ **Ops:** Pas de withdrawal queue, pas de gate, pas de distribution automatique, pas de yield automatique.
- ❌ **People:** Bus factor = 1. Pas d'équipe. Pas d'on-call. Pas de runbook.
- ❌ **DR:** Pas de disaster recovery plan. Pas de BCP.
- ❌ **Monitoring:** Pas de monitoring business. Pas de monitoring on-chain.
- ❌ **Vendors:** Pas de SLA review. Pas de backup vendors.
- ❌ **Reporting:** Pas de reporting financier standard. Pas d'audit annuel. Pas de NAV indépendant.

### Ce qui manque pour être "Institution Ready" (A):

- Tout ce qui manque pour B, plus:
- ❌ **Multi-custodian:** Fireblocks unique = pas de redundancy.
- ❌ **Multi-chain:** Base unique = pas de redundancy.
- ❌ **Multi-LLM:** Hypercli unique = pas de redundancy.
- ❌ **Équipe complète:** Compliance, legal, ops, engineering, customer success.
- ❌ **Certifications:** SOC 2 Type II, ISO 27001.
- ❌ **Insurance:** Cyber, D&O, E&O.
- ❌ **Board / Committees:** Independent directors, investment committee, risk committee.
- ❌ **Fund administrator:** Third-party NAV, third-party custody verification.

### Résumé de la position

| Critère | Évaluation |
|---------|------------|
| Code smart contracts | 🟢 Bon (pre-audit, testnet only) |
| Code frontend/backend | 🟡 Correct (MVP quality, 3 P0 identifiés) |
| Architecture on-chain | 🟢 Bien pensée (reserve model = safe) |
| Architecture off-chain | 🟡 Fragmentée (trop de vendors, pas d'intégration profonde) |
| Gouvernance on-chain | 🟢 Bonne posture |
| Gouvernance off-chain | 🔴 Absente (pas de board, pas de comités) |
| Custody on-chain | 🟢 Excellente (pas de privileged withdraw) |
| Custody off-chain | 🔴 Faible (Fireblocks unique, pas de multi-custodian) |
| Compliance | 🔴 Inexistante |
| Legal | 🔴 Incomplète |
| Operations | 🔴 Ad-hoc |
| People | 🔴 Bus factor = 1 |
| Infrastructure | 🟡 Basique (PaaS, pas de multi-cloud) |
| Monitoring | 🔴 Insuffisant |
| Incident Response | 🔴 Absent |
| Reporting | 🔴 Inadéquat |

**Le système est un prototype techniquement solide mais institutionnellement incomplet.** Il peut servir de démonstration, de preuve de concept, ou de base pour un audit smart contract (Spearbit). Il ne peut PAS accepter des fonds réels de LPs institutionnels dans son état actuel.

---

*Audit produit par analyse statique. Aucune proposition de roadmap. Aucune amélioration suggérée. Uniquement la réalité observée.*
