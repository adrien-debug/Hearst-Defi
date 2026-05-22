---
description: Déploie les smart contracts sur Base Sepolia (Phase 2)
---

# /sc-deploy — Smart Contract Deploy

## Objectif
Déployer les smart contracts sur Base Sepolia (testnet).

## ⚠️ Prérequis
- Variables d'environnement configurées (RPC URL, private key)
- Fonds sur Base Sepolia

## Commande

```bash
cd contracts && forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast
```

## Phase 2 (Sprint 13)
- `EventLogger.sol` — emits Distribution, RebalanceExecuted, AttestationPosted
- `PoRRegistry.sol` — stores attestation hash + URI

## Phase 3 (V1, post-audit)
- `Vault.sol` — ERC-4626 full vault

## Rapport
```
⛓️  Deploy Report
━━━━━━━━━━━━━━━━
Network  : Base Sepolia
Contrats : [liste]
Adresses : [liste]
Tx hash  : [hash]

Status : ✅ Déployé / ❌ Erreur
```
