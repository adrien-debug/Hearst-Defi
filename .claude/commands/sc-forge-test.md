---
description: Lance les tests Foundry des smart contracts
---

# /sc-forge-test — Smart Contract Tests

## Objectif
Exécuter la suite de tests Foundry pour les smart contracts.

## Commande

```bash
cd contracts && forge test
```

## Options
- `--match-test [nom]` : test spécifique
- `--match-contract [nom]` : contrat spécifique
- `-vvv` : verbose (3 niveaux)
- `--gas-report` : rapport de gas

## Couverture
```bash
cd contracts && forge coverage
```

## Exigences
- Couverture > 90%
- Fuzzing sur share math (deposit/withdraw)

## Rapport
```
⛓️  Foundry Test Report
━━━━━━━━━━━━━━━━━━━━━━━
Tests passés   : X
Tests échoués  : X
Couverture     : X%
Gas report     : [si --gas-report]

Status : ✅ Pass / ❌ Fail
```
