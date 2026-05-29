# Package de lancement — Hearst Yield Vault (audit Spearbit)

## 1. Email prêt à envoyer à Spearbit (+ variantes backup)

**Destinataire :** lead@spearbit
**Objet :** Hearst Yield Vault — demande d'audit ERC-4626 (surface ~280 LOC, freeze SHA 898991c, kickoff cible 2026-06-08)

---

Bonjour,

Je suis Adrien, fondateur de Hearst Corporation. Nous sollicitons Spearbit en cabinet primaire pour l'audit de sécurité de **Hearst Yield Vault**, un produit DeFi institutionnel single-vault (yield mining-backed, distributions mensuelles en USDC, structure SPV Cayman, LP qualifiés uniquement).

**Mission**
Audit de sécurité on-chain de trois contrats Solidity custom, plus une revue de configuration de la gouvernance (Timelock + Safe). Code mainnet gaté sur la livraison de votre rapport et la remédiation associée — aucune ligne ne part en production avant votre sign-off.

**Surface (volontairement réduite)**
- 3 contrats sous `contracts/src/`, **~280 LOC de logique bespoke** posée sur OpenZeppelin Contracts **v5.6.1** (submodule gelé `5fd1781b1454fd1ef8e722282f86f9293cacf256`).
  - `HearstYieldVault.sol` — ERC4626 + ERC20 + Ownable + Pausable, `_decimalsOffset()=12`, floor `minDeposit` dans `_deposit`, rôle `guardian` séparé de l'`owner` (`pause()`/`unpause()`), `setGuardian()`/`setMinDeposit()` owner-only, `whenNotPaused` sur `_deposit`/`_withdraw`.
  - `PoRRegistry.sol` — publisher immuable unique, `publish()` append-only (1 attestation par période `YYYYMM`).
  - `EventLogger.sol` — publisher immuable unique, `logEvent()` à id monotone append-only.
- Config : `solc 0.8.24`, optimizer 200 runs, EVM `cancun`, `via_ir=false`.
- **Freeze SHA contrats :** `898991c6ee3c3bfe7637509ecee7ac579dc79388`. Aucun changement de `contracts/src/` entre le gel et la fin du re-audit sans notification et reconfirmation de scope.
- **Test suite : 73/73 verts** (Foundry), dont 13 tests gouvernance (parité `hashOperation` vérifiée, vecteur `0xe13ea3a1e2109dd41ea773534291e0672cfdb9c44dfafc023132149975a9a036`).

**Cadrage Model B (important pour le threat-model)**
Le vault custodie l'USDC en réserve cash. Aucune sortie owner/manager n'existe on-chain : seule la redemption actionnaire fait sortir des fonds. Le principal n'est jamais déployé on-chain ; le mining est financé off-chain (SPV/Fireblocks) et le yield est injecté mensuellement par transfer USDC. Lock-up 60/90j et min-ticket $250k sont des contrôles off-chain (KYC/legal). NAV = `totalAssets` (solde USDC), sans oracle dans le share math.

**Modèle d'ownership cible**
Owner du vault = `TimelockController` (48h, `minDelay 172800`) ← Gnosis Safe 3/5 (proposer/executor/canceller, `admin=address(0)`). Guardian = clé rapide séparée = Safe 2/3 (pause/unpause uniquement). Publisher EventLogger+PoRRegistry = Safe 3/5.

**Budget & fenêtre**
- Enveloppe : **$60,000 – $120,000** (surface réduite — nous visons le bas de fourchette).
- Remédiation : 2 semaines post-rapport, re-audit (fixes uniquement) inclus.
- NDA + accord de scope signés : 2026-06-01.
- **Kickoff + provisioning d'accès : 2026-06-08.** Démarrage Semaine 1 : 2026-06-09. Findings préliminaires : 2026-07-07. Rapport final : 2026-07-24.

**Ce que je vous demande**
1. Un créneau d'équipe sur la fenêtre kickoff 2026-06-08.
2. Votre NDA (ou acceptation du nôtre).
3. Votre accord sur le scope ci-joint (`scope.md`).

Pack de préparation complet prêt à transmettre dès NDA signé : README, scope, architecture, asset-lifecycle (Model B), invariants, threat-model, self-review pré-audit, abi-freeze, instructions de build reproductible. Accès repo read-only au SHA de gel, faucet Base Sepolia, et appel architecture 60 min disponibles sur demande.

Au plaisir de caler un créneau.

Adrien
Founder, Hearst Corporation
adrien@hearstcorporation.io

---

### Variante backup A — Trail of Bits

**Destinataire :** *(contact Trail of Bits)*
**Objet :** Hearst Yield Vault — audit ERC-4626 (~280 LOC sur OZ v5.6.1, freeze 898991c)

Bonjour,

Hearst Corporation cherche un cabinet pour auditer **Hearst Yield Vault** : 3 contrats Solidity custom (~280 LOC de logique bespoke sur OpenZeppelin v5.6.1 @ `5fd1781`), `solc 0.8.24` / optimizer 200 / EVM cancun. Surface : `HearstYieldVault` (ERC4626 + Pausable + guardian séparé, `_decimalsOffset()=12`), `PoRRegistry` et `EventLogger` (publisher immuable, append-only). Test suite 73/73 verte, freeze SHA `898991c6ee3c3bfe7637509ecee7ac579dc79388`. Model B : USDC custodié en réserve cash, aucune sortie owner on-chain, NAV = `totalAssets`. Votre force en analyse statique (Slither, Echidna) nous intéresse particulièrement sur ce périmètre.

Budget $60–120k, NDA visé 2026-06-01, kickoff cible 2026-06-08, re-audit inclus. Pourriez-vous confirmer un créneau et m'envoyer votre NDA ? Pack de préparation et accès repo read-only prêts.

Adrien — Founder, Hearst Corporation — adrien@hearstcorporation.io

---

### Variante backup B — OpenZeppelin Security

**Destinataire :** *(contact OpenZeppelin Security)*
**Objet :** Hearst Yield Vault — audit ERC-4626 sur primitives OZ v5.6.1 (freeze 898991c)

Bonjour,

Hearst Corporation sollicite OpenZeppelin Security pour auditer **Hearst Yield Vault** : 3 contrats custom (~280 LOC) bâtis directement sur vos primitives **OpenZeppelin v5.6.1** (`ERC4626`, `ERC20`, `Ownable`, `Pausable` ; submodule gelé `5fd1781`). Votre connaissance directe de ces primitives — notamment la mécanique ERC-4626 et Pausable — est exactement le profil recherché. Surface : `_decimalsOffset()=12`, floor `minDeposit`, rôle guardian séparé de l'owner, plus `PoRRegistry`/`EventLogger` (publisher immuable, append-only). `solc 0.8.24` / optimizer 200 / cancun, 73/73 tests verts, freeze SHA `898991c6ee3c3bfe7637509ecee7ac579dc79388`. Model B : réserve cash, aucune sortie owner on-chain.

Budget $60–120k, NDA visé 2026-06-01, kickoff cible 2026-06-08, re-audit inclus. Merci de confirmer un créneau et de m'adresser votre NDA. Pack et accès read-only prêts.

Adrien — Founder, Hearst Corporation — adrien@hearstcorporation.io

---

## 2. Scope d'audit final

**Freeze SHA :** `898991c6ee3c3bfe7637509ecee7ac579dc79388`
**Dépendance OZ :** v5.6.1 @ `5fd1781b1454fd1ef8e722282f86f9293cacf256`
**Config build :** `solc 0.8.24`, optimizer 200 runs, EVM `cancun`, `via_ir=false` (`contracts/foundry.toml`)

### IN SCOPE — Contrats (périmètre primaire)

Les trois contrats sous `contracts/src/`.

| Contrat | Chemin | Hérite (OZ v5.6.1) | Surface custom (seule logique bespoke) |
|---|---|---|---|
| `HearstYieldVault` | `contracts/src/HearstYieldVault.sol` | `ERC4626`, `ERC20`, `Ownable`, `Pausable` | `_decimalsOffset()=12` ; floor `minDeposit` dans `_deposit` ; rôle `guardian` avec `pause()`/`unpause()` ; `setGuardian()`/`setMinDeposit()` (owner) ; `whenNotPaused` sur `_deposit` + `_withdraw` |
| `PoRRegistry` | `contracts/src/PoRRegistry.sol` | aucune (standalone) | `publisher` immuable unique ; `publish()` (1 attestation par période `YYYYMM`, append-only) ; vue `getAttestationByPeriod()` |
| `EventLogger` | `contracts/src/EventLogger.sol` | aucune (standalone) | `publisher` immuable unique ; `logEvent()` (id monotone, append-only) |

**Points d'entrée public/external exacts à revoir :**

- `HearstYieldVault` : `deposit` / `mint` / `withdraw` / `redeem` / `convert*` / `preview*` / `max*` (ERC-4626 hérité) ; `transfer` / `approve` etc. (ERC-20 hérité) ; `setMinDeposit(uint256)` (`onlyOwner`) ; `setGuardian(address)` (`onlyOwner`) ; `pause()` (`onlyGuardian`) ; `unpause()` (`onlyGuardian`) ; `decimals()` ; getters publics `guardian()` / `minDeposit()`. **Pas de `subscribe`, `distribute`, `rebalance`, `pauseVault`, `permit`, hook oracle, logique de fees, file de retrait, ni chemin d'upgrade.**
- `PoRRegistry` : `publish(uint64 period, uint256 totalAumUsd, uint256 minedBtcSats, bytes32 evidenceHash, string evidenceCid)` (`onlyPublisher`) ; `getAttestationByPeriod(uint64)` ; getters publics `attestations` / `attestationIdByPeriod` / `lastAttestationId` / `publisher`.
- `EventLogger` : `logEvent(EventKind kind, bytes32 contextHash, string payloadCid)` (`onlyPublisher`) ; getters publics `lastEventId` / `publisher`.

Constructeur du vault (6 args) à vérifier : `(asset, name, symbol, owner, guardian, initialMinDeposit)` ; `require(guardian != address(0))` au constructeur, `require(VAULT_GUARDIAN != VAULT_OWNER)` imposé au déploiement par `DeployHearstYieldVault.s.sol`. Asset USDC Base Sepolia : `0x036CbD53842c5426634e7929541eC2318f3dCF7e`.

### IN SCOPE — Configuration gouvernance (config uniquement, pas le code OZ/Safe)

| Élément | À revoir | Référence |
|---|---|---|
| `TimelockController` (OZ v5.6.1) | `minDelay == 172800` (48h) ; `proposers == executors == [Safe]` ; `admin == address(0)` (self-administered) ; le Safe détient aussi `CANCELLER_ROLE` | `contracts/script/DeployGovernance.s.sol` ; vérifié par `contracts/test/Governance.t.sol` (13 tests) |
| Gnosis Safe 3/5 | 5 owners, threshold 3 ; déployé via Safe UI (hors Foundry) ; posé en proposer/executor du Timelock et en `publisher` d'EventLogger/PoRRegistry | Runbook de déploiement (action opérateur) |
| Transfert d'ownership du vault | `vault.transferOwnership(timelock)` post-déploiement ; `guardian` distinct de l'`owner` | `DeployHearstYieldVault.s.sol` + runbook |
| Parité `hashOperation` | L'off-chain `src/lib/governance/eip712.ts` doit matcher l'on-chain `TimelockController.hashOperation` ; vecteur gelé `0xe13ea3a1e2109dd41ea773534291e0672cfdb9c44dfafc023132149975a9a036` | `architecture.md` + `Governance.t.sol` |

### OUT OF SCOPE

| Item | Raison |
|---|---|
| Source OpenZeppelin v5.6.1 (`ERC4626`, `ERC20`, `Ownable`, `Pausable`, `TimelockController`) | Auditée en amont ; seul notre usage/config est en scope |
| Contrats Gnosis Safe | Audités par Safe ; seule notre config 3/5 est en scope |
| Frontend (`src/components/`, `src/app/`) y compris l'UI d'investissement et `src/lib/onchain/vault.ts` (appels client viem) | Couche app ; aucune custody de fonds, appelle le vault audité côté client |
| Gouvernance off-chain (`src/lib/governance/*` — server actions, machine à états, hashing EIP-712) | Orchestration off-chain ; produit des hashes pour Safe/Timelock, ne détient aucun fonds |
| Scenario engine (`src/lib/engine/*`) | Pure-function, pas d'I/O, pas d'appel on-chain |
| Agents LLM (`src/lib/agents/*`) | JSON structuré uniquement, aucune autorité d'écriture DB, ne peut pas déclencher de tx on-chain |
| Jobs Inngest / routes `src/app/api/*` | Off-chain ; webhooks HMAC ; aucun chemin de fonds direct |
| Intégration custody Fireblocks | Viewer read-only ; couvert par le SOC 2 / compliance Fireblocks |
| `prisma/schema.prisma`, `docs/`, CI/CD | DB off-chain / docs / infra |

`contracts/test/` et `contracts/script/` sont du matériel de référence (lisibles par l'auditeur ; non déployables, hors scope déployable).

### Build reproductible

```bash
# 1. Cloner au SHA de gel et synchroniser le submodule OZ pinné
git clone <repo> hearst-connect && cd hearst-connect
git checkout 898991c6ee3c3bfe7637509ecee7ac579dc79388
git submodule update --init --recursive
# OZ doit être à : 5fd1781b1454fd1ef8e722282f86f9293cacf256
git -C contracts/lib/openzeppelin-contracts rev-parse HEAD   # attendu: 5fd1781...

# 2. Build (config foundry.toml : solc 0.8.24, optimizer 200, evm cancun, via_ir=false)
cd contracts
forge build

# 3. Suite de tests (attendu : 73/73 verts)
forge test

# 4. Vérifier que le gel contrat tient (attendu : diff vide)
git -C .. diff 79d0ef9 898991c -- contracts/src/
```

---

## 3. Liste des documents à transmettre

Pack Spearbit (répertoire `docs/audit/spearbit-prep-2026-05-26/`) :

- `docs/audit/spearbit-prep-2026-05-26/README.md` — overview produit, shortlist firmes, budget/timeline, gel, note de réconciliation, sommaire du pack.
- `docs/audit/spearbit-prep-2026-05-26/scope.md` — frontières IN/OUT exactes, fonctions par contrat, config gouvernance, provisioning d'accès.
- `docs/audit/spearbit-prep-2026-05-26/architecture.md` — diagramme d'ownership, asset-flow, modèle guardian/owner/timelock, deps OZ gelées.
- `docs/audit/spearbit-prep-2026-05-26/asset-lifecycle.md` — RR-SC-07, cycle de vie définitif d'1 USDC (flux funds/data/governance, ruling Model B, décisions).
- `docs/audit/spearbit-prep-2026-05-26/invariants.md` — invariants business + safety à vérifier.
- `docs/audit/spearbit-prep-2026-05-26/threat-model.md` — modèle de confiance, flux d'actifs, surfaces d'attaque, mitigations.
- `docs/audit/spearbit-prep-2026-05-26/previous-findings.md` — self-review pré-audit (PRE-01 posture reentrancy, PRE-02 donation/inflation → `_decimalsOffset=12`, PRE-09 homoglyphes off-chain, PRE-10 split guardian/owner, PRE-11 pas de manager-withdraw).
- `docs/audit/spearbit-prep-2026-05-26/abi-freeze.json` — ABIs compilées des 3 contrats au SHA de gel. Le champ `deployed_address` du vault porte la valeur `TO_BE_REDEPLOYED` (l'ancienne adresse testnet `0xEc733c6dbD69F862489a9Da01338aA5D39C1F60d` prédate le paramètre guardian B6) ; EventLogger et PoRRegistry portent `TO_BE_FILLED` (déploiement via `DeployBaseSepolia.s.sol`, publisher = Safe 3/5). Ces trois champs sont renseignés à la précondition de redéploiement avant kickoff (voir §4).

ADRs pertinents :

- `docs/decisions/ADR-001.md` — structure Cayman Exempted LP.
- `docs/decisions/ADR-006.md` — gate mainnet sur audit Spearbit complet + remédiation ; Monte Carlo V2 ; multi-vault.
- `docs/decisions/ADR-008.md` — 2 share classes (A / B).

Code & build :

- `contracts/src/HearstYieldVault.sol`, `contracts/src/PoRRegistry.sol`, `contracts/src/EventLogger.sol` (au SHA `898991c`).
- `contracts/foundry.toml` — config build (`solc 0.8.24`, optimizer 200, evm cancun, `via_ir=false`).
- `contracts/script/DeployHearstYieldVault.s.sol`, `contracts/script/DeployGovernance.s.sol`, `contracts/script/DeployBaseSepolia.s.sol` (référence, non déployable).
- `contracts/test/Governance.t.sol` (13 tests gouvernance) + suite complète (73/73).
- `contracts/README.md` — adresses Base Sepolia déployées.
- Instructions de build reproductible : voir bloc §2 « Build reproductible » ci-dessus (clone @ `898991c`, submodule OZ @ `5fd1781`, `forge build`, `forge test` → 73/73).

---

## 4. Data room checklist

| # | Ressource | Type d'accès | Fourni par | Détail |
|---|---|---|---|---|
| 1 | Repo GitHub au freeze SHA `898991c6ee3c3bfe7637509ecee7ac579dc79388` | Collaborateur read-only | @adrien-debug | Provisionné au kickoff 2026-06-08 ; submodule OZ pinné `5fd1781b1454fd1ef8e722282f86f9293cacf256` |
| 2 | Build Foundry vérifié | Repro `forge build` + `foundry.toml` | Engineering | `solc 0.8.24`, optimizer 200, evm cancun, `via_ir=false` ; `forge test` attendu 73/73 |
| 3 | Adresses Base Sepolia déployées | `contracts/README.md` + `abi-freeze.json` (champ `deployed_address`) | Engineering | Asset USDC : `0x036CbD53842c5426634e7929541eC2318f3dCF7e` ; vault `0xEc733c6dbD69F862489a9Da01338aA5D39C1F60d` PRÉDATE le guardian → redéployé avant kickoff via `DeployHearstYieldVault.s.sol`, nouvelle adresse renseignée dans `abi-freeze.json` ; EventLogger + PoRRegistry via `DeployBaseSepolia.s.sol`, Timelock via `DeployGovernance.s.sol` |
| 4 | ETH testnet (Base Sepolia) | Top-up faucet sur demande | Engineering | Adresses auditeur créditées sous 24h |
| 5 | Appel architecture (60 min) | Zoom, enregistré | Engineering + lead auditeur | Cadrage Model B, ownership Timelock/Safe, split guardian/owner ; planifié semaine du kickoff |
| 6 | Canal Q&A dédié | Telegram/Signal async | adrien@hearstcorporation.io | Ouvert dès NDA signé (2026-06-01), actif sur toute la durée de l'audit |
| 7 | Vecteur de parité gouvernance | Fichier (vérifiable) | Engineering | `hashOperation` parity `0xe13ea3a1e2109dd41ea773534291e0672cfdb9c44dfafc023132149975a9a036` (off-chain `src/lib/governance/eip712.ts` vs on-chain `TimelockController`) |
| 8 | NDA + accord de scope | Signés | Adrien + auditeur | Cible 2026-06-01, avant provisioning d'accès |

**Préconditions à lever avant le kickoff 2026-06-08 :**
- Redéployer le vault sur Base Sepolia avec le constructeur 6 args (guardian séparé) via `DeployHearstYieldVault.s.sol` (`VAULT_ASSET`/`VAULT_OWNER`/`VAULT_GUARDIAN`/`VAULT_MIN_DEPOSIT`, `require VAULT_GUARDIAN != VAULT_OWNER`, `VAULT_MIN_DEPOSIT = 250000000000` soit $250k en USDC 6 décimales) — l'ancienne adresse `0xEc733c6dbD69F862489a9Da01338aA5D39C1F60d` prédate le guardian.
- Renseigner les nouvelles adresses déployées (vault redéployé, EventLogger, PoRRegistry, Timelock) dans `abi-freeze.json` et `contracts/README.md` (remplace les marqueurs `TO_BE_REDEPLOYED` / `TO_BE_FILLED`).
- Vérifier le gel contrat : `git diff 79d0ef9 898991c -- contracts/src/` doit retourner un diff vide (confirmé : aucune correction ne touche `contracts/src/`).
