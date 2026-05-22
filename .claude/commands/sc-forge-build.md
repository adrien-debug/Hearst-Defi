---
description: Compile les smart contracts avec Foundry
---

# /sc-forge-build — Smart Contract Build

## Objectif
Compiler les smart contracts Solidity avec Foundry.

## Commande

```bash
cd contracts && forge build
```

## Vérification
Vérifier que `contracts/out/` contient les artifacts compilés.

## Rapport
```
⛓️  Foundry Build Report
━━━━━━━━━━━━━━━━━━━━━━━━
Contrats   : EventLogger, PoRRegistry, Vault
Status     : ✅ Compilé / ❌ Erreur

Si erreur : lire le message et corriger le Solidity
```
