# Livrable 1 — Runbook Safe 3/5 + Safe Guardian 2/3 (Base Sepolia)

**Réseau cible :** Base Sepolia (chain ID `84532`)
**Outil :** [app.safe.global](https://app.safe.global)
**Objectif :** créer le Safe de gouvernance 3/5 (`GOVERNANCE_SAFE`) et le Safe guardian 2/3 (`GUARDIAN_SAFE`), deux multisig **distincts** avec des owners **différents**.

---

## 0. Pré-requis

- 5 wallets EOA (MetaMask, Rabby ou Ledger) pour les owners du Safe 3/5 — noter les 5 adresses `0x…`.
- 3 wallets EOA **différents des 5 précédents** pour le Safe guardian 2/3 — noter les 3 adresses `0x…`.
  Au moins 2 des 3 owners guardian ne doivent pas figurer dans le Safe 3/5 (séparation owner/guardian = finding PRE-10).
- Du Base Sepolia ETH sur le wallet qui crée chaque Safe (faucet : [coinbase.com/faucets/base-sepolia-faucet](https://www.coinbase.com/faucets/base-sepolia-faucet)). Compter ~0.01 ETH par création.

---

## 1. Créer le Safe de gouvernance 3/5 → `GOVERNANCE_SAFE`

1. Aller sur [app.safe.global](https://app.safe.global). Connecter le wallet déployeur (un des 5 owners).
2. Vérifier en haut à gauche que le réseau sélectionné est **Base Sepolia**. S'il n'apparaît pas, l'ajouter via le sélecteur réseau (« Add network » → Base Sepolia, RPC `https://sepolia.base.org`, chain ID `84532`).
3. Cliquer **Create account** → **Create new Safe Account**.
4. **Name** : `Hearst Governance 3of5`. Confirmer le réseau **Base Sepolia**. Next.
5. **Signers and confirmations** : ajouter les **5 adresses owner**. Donner un libellé à chacune (`gov-owner-1` … `gov-owner-5`).
6. **Threshold** : sélectionner **3 out of 5**. Next.
7. **Review** : vérifier 5 signers, threshold 3, réseau Base Sepolia. Cliquer **Next** puis **Create**, signer la transaction de déploiement, attendre la confirmation on-chain.
8. Copier l'adresse du Safe affichée (format `base-sep:0x…`). **L'adresse à conserver est la partie `0x…`** (40 hex), sans le préfixe `base-sep:`.

➡️ **Cette adresse est `GOVERNANCE_SAFE`.** Elle servira à la fois de PROPOSER+EXECUTOR du Timelock et de `HEARST_PUBLISHER` (EventLogger + PoRRegistry).

---

## 2. Créer le Safe guardian 2/3 → `GUARDIAN_SAFE`

1. Toujours sur [app.safe.global], **Base Sepolia**, connecter un des 3 wallets guardian.
2. **Create account** → **Create new Safe Account**.
3. **Name** : `Hearst Guardian 2of3`. Réseau **Base Sepolia**. Next.
4. **Signers** : ajouter les **3 adresses guardian** (`guardian-1`, `guardian-2`, `guardian-3`).
5. **Threshold** : **2 out of 3**. Next.
6. **Review** → **Create**, signer, attendre la confirmation.
7. Copier l'adresse `0x…`.

➡️ **Cette adresse est `GUARDIAN_SAFE`.** Elle servira de `VAULT_GUARDIAN` (pause/unpause uniquement).

**Garde-fou bloquant :** `GUARDIAN_SAFE` doit être **≠** `GOVERNANCE_SAFE` (et ≠ `VAULT_OWNER` au déploiement), sinon le script `DeployHearstYieldVault.s.sol` revert sur `require(guardian != owner, "VAULT_GUARDIAN must differ from VAULT_OWNER")`.

---

## 3. Où noter les deux adresses

Renseigner ces deux variables dans le shell d'opération (jamais committées, jamais dans `contracts/src`) :

```bash
export GOVERNANCE_SAFE=0x...   # Safe 3/5 — étape 1
export GUARDIAN_SAFE=0x...     # Safe 2/3 — étape 2
```

Tenir à jour le tableau de référence d'opération (hors repo, p. ex. gestionnaire de secrets / note d'équipe) :

| Variable | Rôle | Threshold | Owners |
|---|---|---|---|
| `GOVERNANCE_SAFE` | PROPOSER+EXECUTOR Timelock, publisher EventLogger+PoRRegistry | 3 / 5 | gov-owner-1…5 |
| `GUARDIAN_SAFE` | pause/unpause vault uniquement | 2 / 3 | guardian-1…3 |

Les valeurs d'env applicatives (`NEXT_PUBLIC_HEARST_VAULT_ADDRESS`, etc.) sont renseignées après l'étape de déploiement (Livrable 3), pas ici.

---

## 4. Financer le `GOVERNANCE_SAFE`

Le Safe 3/5 sera le proposer/executor du Timelock et le publisher. Il n'a pas besoin de fonds pour ces appels (les transactions sont relayées et payées par le wallet signataire qui exécute). Aucune action de funding supplémentaire requise sur les Safe pour le testnet ; seul le wallet qui clique « Execute » dans l'UI Safe doit avoir du Base Sepolia ETH.

---

# Livrable 2 — Matrice des rôles — Production Hearst Yield Vault

Réseau : Base Sepolia (cible prod identique, mainnet gated audit Spearbit — ADR-006). Model B : le principal reste en cash réserve / mining, **non déployé on-chain** ; le vault ERC-4626 ne détient que l'USDC effectivement déposé, et aucune fonction owner-withdraw n'existe (finding PRE-11).

| Acteur | Identité | Peut faire (fonctions exactes) | NE peut PAS faire |
|---|---|---|---|
| **Safe 3/5** (`GOVERNANCE_SAFE`) | Multisig 3-of-5 | Détient `PROPOSER_ROLE`, `EXECUTOR_ROLE`, `CANCELLER_ROLE` sur le Timelock (octroyés à la construction OZ : un proposer reçoit aussi CANCELLER). Donc : `timelock.schedule(...)`, `timelock.scheduleBatch(...)`, `timelock.execute(...)`, `timelock.executeBatch(...)`, `timelock.cancel(bytes32)`. Via une proposition Timelock mûrie (48h), pilote indirectement `vault.setMinDeposit(uint256)`, `vault.setGuardian(address)`, `vault.transferOwnership(address)`, `vault.renounceOwnership()`. | Ne peut **pas** modifier le vault sans passer par le Timelock (n'est PAS owner direct du vault). Ne peut **pas** raccourcir le délai sans une proposition Timelock (`updateDelay` n'est appelable que par le Timelock lui-même via proposition). Ne peut **pas** `pause()`/`unpause()` (réservé au guardian). Ne peut **pas** sortir d'USDC du vault (aucune fonction owner-withdraw — finding PRE-11, Model B). |
| **TimelockController** (OZ, `GOVERNANCE_SAFE` proposer/executor) | Contrat, `minDelay = 172800` (48h), `admin = address(0)` (self-administered) | Est l'**owner du vault** après transfert. Exécute après 48h : `setMinDeposit`, `setGuardian`, `transferOwnership`, `renounceOwnership`. Détient `DEFAULT_ADMIN_ROLE` **sur lui-même** (`address(this)`) → seul lui peut `grantRole`/`revokeRole`/`updateDelay`, et uniquement via une proposition mûrie. | Ne peut **pas** agir hors d'une opération planifiée puis mûrie (48h). Ne peut **pas** `pause()`/`unpause()` le vault (pas guardian). Aucun EOA externe ne détient `DEFAULT_ADMIN_ROLE` (admin=0). |
| **Guardian Safe 2/3** (`GUARDIAN_SAFE` = `vault.guardian`) | Multisig 2-of-3, clé rapide séparée | `vault.pause()` et `vault.unpause()` (modifier `onlyGuardian`). Gel/dégel d'urgence des dépôts ET des retraits : `_deposit` et `_withdraw` sont tous deux `whenNotPaused`, donc la pause bloque l'entrée (`deposit`/`mint`) et la sortie (`withdraw`/`redeem`). | Ne peut **pas** `setMinDeposit`, `setGuardian`, `transferOwnership` (toutes `onlyOwner` → Timelock). Ne peut **pas** sortir d'USDC. Ne peut **pas** se remplacer lui-même (le changement de guardian passe par le Timelock). N'a **aucun** rôle sur le Timelock, EventLogger ou PoRRegistry. |
| **Publisher** (`HEARST_PUBLISHER` = `GOVERNANCE_SAFE`) | Single publisher immuable d'EventLogger + PoRRegistry | Publier les logs d'événement (EventLogger, append-only) et les attestations PoR (PoRRegistry : 1 attestation / période `YYYYMM`, append-only). | Ne peut **pas** être changé (publisher immuable, fixé en constructeur). Ne peut **pas** modifier/supprimer une entrée existante (append-only). N'a **aucun** pouvoir sur le vault ni le Timelock (rôle purement attestatif). |
| **DEFAULT_ADMIN du Timelock** | `address(0)` — personne | — | Aucun EOA / Safe ne détient ce rôle ; il appartient à `address(this)` (le Timelock). Aucune administration externe possible : tout passe par proposition timelockée. |

**Rôles OZ TimelockController — récapitulatif des identifiants on-chain :**

- `PROPOSER_ROLE = keccak256("PROPOSER_ROLE")` → `GOVERNANCE_SAFE`
- `EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE")` → `GOVERNANCE_SAFE`
- `CANCELLER_ROLE = keccak256("CANCELLER_ROLE")` → `GOVERNANCE_SAFE` (octroyé automatiquement à tout proposer par OZ v5)
- `DEFAULT_ADMIN_ROLE` → `address(this)` (le Timelock), `admin` constructeur = `address(0)`

---

# Livrable 3 — Checklist de déploiement — Base Sepolia

**Gel contrat :** `contracts/src @ 898991c`. Aucun fichier de `contracts/src` n'est touché ici. Vérifier avant : `git diff 898991c HEAD -- contracts/src` doit être vide.

**Compilation figée :** OZ v5.6.1 (`5fd1781b`), solc `0.8.24`, optimizer 200, evm `cancun`, `via_ir=false`. `forge test` = **73/73 verts** attendus.

---

## Étape 0 — Variables d'environnement (shell d'opération)

```bash
# ── Secrets (jamais committés) ──
export DEPLOYER_PRIVATE_KEY=0x<clé_privée_déployeur>   # wallet financé en Base Sepolia ETH
export BASESCAN_API_KEY=<clé_basescan>                  # pour --verify

# ── Safe (Livrable 1) ──
export GOVERNANCE_SAFE=0x<safe_3of5>     # PROPOSER/EXECUTOR Timelock + publisher
export GUARDIAN_SAFE=0x<safe_2of3>       # guardian pause/unpause

# ── Valeurs publiques figées ──
export VAULT_ASSET=0x036CbD53842c5426634e7929541eC2318f3dCF7e   # USDC Circle Base Sepolia
export VAULT_MIN_DEPOSIT=250000000000                           # 250 000 USDC (6 décimales)
export RPC=https://sepolia.base.org
export CHAIN_ID=84532
```

Sanity avant tout broadcast :

```bash
cd "/Users/adrienbeyondcrypto/Dev/Hearst Corporation/connect — Hearst Defi/contracts"
forge build
forge test                      # attendu : 73/73 passed
git diff 898991c HEAD -- src     # attendu : vide (gel tenu)
```

---

## Étape 1 — Déployer le TimelockController (48h)

Simulation d'abord (sans `--broadcast`) :

```bash
GOVERNANCE_SAFE=$GOVERNANCE_SAFE \
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $RPC
```

Puis broadcast + vérification BaseScan :

```bash
GOVERNANCE_SAFE=$GOVERNANCE_SAFE \
forge script script/DeployGovernance.s.sol:DeployGovernance \
  --rpc-url $RPC \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

Récupérer l'adresse loggée `TimelockController:` :

```bash
export TIMELOCK=0x<adresse_timelock_loggée>
```

Le log doit afficher `minDelay confirmed: 172800` et `admin : address(0) - self-administered`. Ne PAS définir `TIMELOCK_MIN_DELAY` sur le Timelock de gouvernance (cette override n'est réservée qu'au Timelock jetable de test — voir Note D4).

---

## Étape 2 — Déployer le vault avec guardian

**`VAULT_OWNER` au déploiement = l'EOA déployeur** (dérivé de `DEPLOYER_PRIVATE_KEY`). On déploie d'abord avec le déployeur comme owner, puis on transfère l'ownership au Timelock à l'Étape 4 (on ne peut pas faire passer le `transferOwnership` initial par le Timelock puisque le vault n'existe pas encore). `VAULT_GUARDIAN = $GUARDIAN_SAFE`, qui doit différer de `VAULT_OWNER` (`require(guardian != owner)` du script).

```bash
export VAULT_OWNER=$(cast wallet address --private-key $DEPLOYER_PRIVATE_KEY)
```

Simulation :

```bash
DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY \
VAULT_ASSET=$VAULT_ASSET \
VAULT_OWNER=$VAULT_OWNER \
VAULT_GUARDIAN=$GUARDIAN_SAFE \
VAULT_MIN_DEPOSIT=$VAULT_MIN_DEPOSIT \
forge script script/DeployHearstYieldVault.s.sol:DeployHearstYieldVault \
  --rpc-url $RPC
```

Broadcast + verify :

```bash
DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY \
VAULT_ASSET=$VAULT_ASSET \
VAULT_OWNER=$VAULT_OWNER \
VAULT_GUARDIAN=$GUARDIAN_SAFE \
VAULT_MIN_DEPOSIT=$VAULT_MIN_DEPOSIT \
forge script script/DeployHearstYieldVault.s.sol:DeployHearstYieldVault \
  --rpc-url $RPC \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

Récupérer l'adresse :

```bash
export VAULT=0x<adresse_HearstYieldVault_loggée>
```

Renseigner ensuite l'env applicatif (l'app lit `NEXT_PUBLIC_HEARST_VAULT_ADDRESS`) :

```bash
# .env.local de l'app — pas dans contracts/src
NEXT_PUBLIC_HEARST_VAULT_ADDRESS=$VAULT
```

---

## Étape 3 — Déployer EventLogger + PoRRegistry (publisher = Safe 3/5)

```bash
HEARST_PUBLISHER=$GOVERNANCE_SAFE \
forge script script/DeployBaseSepolia.s.sol:DeployBaseSepolia \
  --rpc-url $RPC
```

Broadcast + verify :

```bash
HEARST_PUBLISHER=$GOVERNANCE_SAFE \
forge script script/DeployBaseSepolia.s.sol:DeployBaseSepolia \
  --rpc-url $RPC \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

```bash
export EVENT_LOGGER=0x<adresse_EventLogger_loggée>
export POR_REGISTRY=0x<adresse_PoRRegistry_loggée>
```

---

## Étape 4 — Transférer l'ownership du vault au Timelock

```bash
cast send $VAULT \
  "transferOwnership(address)" $TIMELOCK \
  --rpc-url $RPC \
  --private-key $DEPLOYER_PRIVATE_KEY
```

À partir d'ici, **toute** modification de paramètre du vault (`setMinDeposit`, `setGuardian`) passe par une proposition Timelock 48h pilotée depuis le Safe 3/5. Le guardian (`pause`/`unpause`) reste immédiat.

Si l'un des contrats n'a pas été auto-vérifié pendant le broadcast, relancer manuellement. Le `--constructor-args` doit respecter l'ordre exact du constructeur `(address asset, string name, string symbol, address owner, address guardian, uint256 minDeposit)` :

```bash
forge verify-contract $VAULT \
  src/HearstYieldVault.sol:HearstYieldVault \
  --chain 84532 \
  --constructor-args $(cast abi-encode \
    "constructor(address,string,string,address,address,uint256)" \
    $VAULT_ASSET "Hearst Yield Vault Share" "hyvUSDC" $VAULT_OWNER $GUARDIAN_SAFE $VAULT_MIN_DEPOSIT) \
  --etherscan-api-key $BASESCAN_API_KEY \
  --watch
```

(Adapter le `--constructor-args` pour le Timelock — `constructor(uint256,address[],address[],address)` avec `(172800,[GOVERNANCE_SAFE],[GOVERNANCE_SAFE],0x0)` — et pour EventLogger/PoRRegistry — `constructor(address)` avec `GOVERNANCE_SAFE` — de la même manière si nécessaire.)

---

# Livrable 4 — Checklist de validation — post-déploiement Base Sepolia

`RPC=https://sepolia.base.org`, `CHAIN=84532`. Variables `$TIMELOCK`, `$VAULT`, `$GOVERNANCE_SAFE`, `$GUARDIAN_SAFE`, `$EVENT_LOGGER`, `$POR_REGISTRY` issues du Livrable 3.

---

## A. Lectures on-chain (état de gouvernance)

| # | Commande | Résultat attendu |
|---|---|---|
| A1 | `cast call $TIMELOCK "getMinDelay()(uint256)" --rpc-url $RPC` | `172800` |
| A2 | `cast call $TIMELOCK "hasRole(bytes32,address)(bool)" $(cast keccak "PROPOSER_ROLE") $GOVERNANCE_SAFE --rpc-url $RPC` | `true` |
| A3 | `cast call $TIMELOCK "hasRole(bytes32,address)(bool)" $(cast keccak "EXECUTOR_ROLE") $GOVERNANCE_SAFE --rpc-url $RPC` | `true` |
| A4 | `cast call $TIMELOCK "hasRole(bytes32,address)(bool)" $(cast keccak "CANCELLER_ROLE") $GOVERNANCE_SAFE --rpc-url $RPC` | `true` |
| A5 | `cast call $TIMELOCK "hasRole(bytes32,address)(bool)" 0x0000000000000000000000000000000000000000000000000000000000000000 $GOVERNANCE_SAFE --rpc-url $RPC` | `false` (aucun EOA/Safe n'est DEFAULT_ADMIN) |
| A6 | `cast call $TIMELOCK "hasRole(bytes32,address)(bool)" 0x0000000000000000000000000000000000000000000000000000000000000000 $TIMELOCK --rpc-url $RPC` | `true` (self-administered) |
| A7 | `cast call $VAULT "owner()(address)" --rpc-url $RPC` | `$TIMELOCK` |
| A8 | `cast call $VAULT "guardian()(address)" --rpc-url $RPC` | `$GUARDIAN_SAFE` |
| A9 | `cast call $VAULT "paused()(bool)" --rpc-url $RPC` | `false` |
| A10 | `cast call $VAULT "asset()(address)" --rpc-url $RPC` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| A11 | `cast call $VAULT "minDeposit()(uint256)" --rpc-url $RPC` | `250000000000` |
| A12 | `cast call $VAULT "decimals()(uint8)" --rpc-url $RPC` | `18` (offset 12 sur USDC 6 déc) |
| A13 | `cast call $EVENT_LOGGER "publisher()(address)" --rpc-url $RPC` | `$GOVERNANCE_SAFE` |
| A14 | `cast call $POR_REGISTRY "publisher()(address)" --rpc-url $RPC` | `$GOVERNANCE_SAFE` |
| A15 | Sur BaseScan : `$TIMELOCK`, `$VAULT`, `$EVENT_LOGGER`, `$POR_REGISTRY` | onglet « Contract » avec coche verte « Verified » |

---

## B. Smoke tests — vault (dépôt / min-ticket)

Pré-requis : un wallet test détenant ≥ 250 000 USDC test Base Sepolia (`$TESTER`, `$TESTER_KEY`), USDC approuvé.

```bash
# Approuver
cast send $VAULT_ASSET "approve(address,uint256)" $VAULT 250000000000 \
  --rpc-url $RPC --private-key $TESTER_KEY
```

| # | Action | Attendu |
|---|---|---|
| B1 | `cast send $VAULT "deposit(uint256,address)" 250000000000 $TESTER --rpc-url $RPC --private-key $TESTER_KEY` | succès, shares émises (≈ `250000000000 * 10^12`) |
| B2 | `cast send $VAULT "deposit(uint256,address)" 100000000 $TESTER --rpc-url $RPC --private-key $TESTER_KEY` (100 USDC < min) | **revert** `DepositBelowMinimum` (en dessous du min-ticket) |
| B3 | `cast call $VAULT "totalAssets()(uint256)" --rpc-url $RPC` | = solde USDC du vault (NAV = totalAssets, Model B — principal hors-chaîne en réserve, seul l'USDC déposé est on-chain) |

---

## C. Smoke tests — guardian pause / séparation des pouvoirs

| # | Action | Attendu |
|---|---|---|
| C1 | Pause par le guardian : depuis le Safe 2/3, proposer+confirmer (2 sigs) `pause()` sur `$VAULT`, exécuter | succès, `paused()` → `true` |
| C2 | `cast send $VAULT "deposit(uint256,address)" 250000000000 $TESTER --rpc-url $RPC --private-key $TESTER_KEY` pendant pause | **revert** (`whenNotPaused` bloque `_deposit`) |
| C3 | Tentative de pause par un NON-guardian : `cast send $VAULT "pause()" --rpc-url $RPC --private-key $TESTER_KEY` | **revert** `NotGuardian` (modifier `onlyGuardian`) |
| C4 | Tentative de pause par l'owner (Timelock/EOA déployeur, qui n'est pas guardian) : `cast send $VAULT "pause()" --rpc-url $RPC --private-key $DEPLOYER_PRIVATE_KEY` | **revert** `NotGuardian` (l'owner n'a pas le pouvoir de pause) |
| C5 | Unpause par le guardian : depuis le Safe 2/3, `unpause()` (2 sigs), exécuter | succès, `paused()` → `false` |
| C6 | `cast send $VAULT "deposit(uint256,address)" 250000000000 $TESTER …` après unpause | succès (dépôts ré-ouverts) |

---

## D. Smoke test — proposition Timelock (48h)

Cible de test : `setMinDeposit(uint256)` via le Timelock, depuis le Safe 3/5.

```bash
# Payload : setMinDeposit(250000000000) inchangé (test no-op, sûr)
export DATA=$(cast calldata "setMinDeposit(uint256)" 250000000000)
export PREDECESSOR=0x0000000000000000000000000000000000000000000000000000000000000000
export SALT=0x0000000000000000000000000000000000000000000000000000000000000001
export DELAY=172800
```

| # | Action (depuis le Safe 3/5, via app.safe.global → Transaction Builder, vers `$TIMELOCK`) | Attendu |
|---|---|---|
| D1 | `schedule($VAULT, 0, $DATA, $PREDECESSOR, $SALT, $DELAY)` — proposer + 3 sigs + execute Safe | succès ; `cast call $TIMELOCK "isOperationPending(bytes32)(bool)" <id>` → `true` |
| D2 | Tenter `execute(...)` immédiatement (avant 48h) | **revert** (`TimelockUnexpectedOperationState`, opération non mûrie) |
| D3 | Calculer l'id : `cast call $TIMELOCK "hashOperation(address,uint256,bytes,bytes32,bytes32)(bytes32)" $VAULT 0 $DATA $PREDECESSOR $SALT --rpc-url $RPC` ; vérifier `getTimestamp(id)` | timestamp = bloc de scheduling + 172800 |
| D4 | Après 48h (utiliser une opération réelle en conditions de prod ; en test d'intégration, redéployer un Timelock jetable avec `TIMELOCK_MIN_DELAY` court) : `execute($VAULT, 0, $DATA, $PREDECESSOR, $SALT)` depuis le Safe 3/5 | succès ; `isOperationDone(id)` → `true` |
| D5 | `cast send $TIMELOCK "schedule(...)" --private-key $TESTER_KEY` (non-proposer) | **revert** (`AccessControlUnauthorizedAccount`, pas de `PROPOSER_ROLE`) |

**Note D4 :** sur le Timelock prod (delay 172800 figé), valider D1→D3 puis attendre réellement 48h pour D4, OU valider le mécanisme complet sur un Timelock jetable déployé avec `TIMELOCK_MIN_DELAY=60`. Ne jamais raccourcir le delay du Timelock de gouvernance.

---

**Sources exactes utilisées :** `contracts/script/DeployHearstYieldVault.s.sol` (require `guardian != owner`, ordre constructeur, libellés `console.log`), `DeployGovernance.s.sol` (`minDelay` 172800, `proposers==executors==[GOVERNANCE_SAFE]`, `admin=address(0)`, override `TIMELOCK_MIN_DELAY`), `DeployBaseSepolia.s.sol` (`HEARST_PUBLISHER` → EventLogger+PoRRegistry), `contracts/foundry.toml` (solc 0.8.24 / optimizer 200 / cancun / via_ir=false), `contracts/src/HearstYieldVault.sol` (`onlyGuardian`→`NotGuardian`, `onlyOwner`, `_deposit`/`_withdraw` `whenNotPaused`, `DepositBelowMinimum`, `_decimalsOffset=12`→decimals 18), `lib/openzeppelin-contracts` v5.6.1 `@5fd1781b` (TimelockController : rôles + signatures `schedule`/`execute`/`cancel`/`getMinDelay`/`hashOperation`). Gel contrat vérifié : `git diff 898991c HEAD -- contracts/src` = vide ; `forge test` = 73 passed, 0 failed.
