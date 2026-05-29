# Brief Counsel — Hearst Yield Vault (Cayman ELP, Model B)

## Livrable 1 — Email prêt à envoyer à Maples

```
À : contact-funds@maples.com (Partner, Investment Funds — bureau Cayman)
Cc : adrien@hearstcorporation.io
Objet : Engagement — PPM & LPA Cayman Exempted Limited Partnership (Hearst Yield Vault, Model B / réserve USDC)

Bonjour,

Hearst Corporation souhaite engager Maples and Calder (Cayman) pour la constitution et la documentation d'offre d'un fonds institutionnel de yield structuré adossé au mining Bitcoin : le « Hearst Yield Vault » (ticker interne HYV-A).

Structure visée : Cayman Exempted Limited Partnership (ELP), distribution exclusivement à des investisseurs professionnels / qualifiés (Rule 506(c) côté US, Private Investment Fund côté Cayman). Aucune offre retail. Pas de KYC in-app au stade MVP — la due diligence investisseur est exécutée off-chain (Persona pour l'identité, screening AML/sanctions cadré avec vous) et par l'administrateur de fonds.

Le point déterminant qui doit cadrer toute la documentation (PPM / LPA / subscription agreement) est notre modèle économique on-chain, dit « Model B » (décision interne close, RR-SC-07) :

- Le principal des LP (en USDC) est CUSTODIÉ EN RÉSERVE dans un contrat ERC-4626 (« HearstYieldVault.sol », OpenZeppelin v5.6.1). Il N'EST PAS déployé on-chain.
- Aucun rôle (owner, manager, guardian) ne dispose d'une fonction d'extraction du principal. Le code ne comporte aucun chemin de sortie des fonds vers une adresse autre qu'un actionnaire qui rachète ses propres parts. Les owner/guardian peuvent uniquement : (a) bloquer de nouveaux dépôts, (b) faire tourner la clé guardian, (c) mettre en pause / lever la pause. Jamais extraire.
- Le mining est financé OFF-VAULT (SPV Cayman / custody Fireblocks). Le yield est une distribution de revenue-share mining injectée mensuellement par simple transfer USDC dans le vault, ce qui fait monter la NAV automatiquement (NAV = totalAssets = solde USDC du contrat ; pas d'oracle dans le calcul des parts).
- Le lock-up (60 j Class A / 90 j Class B) et le minimum de ticket ($250k / $1M) sont des obligations OFF-CHAIN (LPA / subscription), sans verrou on-chain.

Deux classes de parts sont prévues (ADR-008, ci-jointe) :
- Class A — min $250 000, lock-up soft 60 j, management fee 1 % (100 bps), performance fee 10 % (1000 bps) avec High-Water Mark.
- Class B — min $1 000 000, lock-up soft 90 j, management fee 0,75 % (75 bps), performance fee 8 % (800 bps) avec High-Water Mark.

Gouvernance des clés on-chain : l'owner du contrat est un Safe multisig 3-sur-5 derrière un timelock de 48 h ; le rôle guardian (pause/unpause uniquement) est porté par une clé séparée, distincte des signataires du Safe.

Périmètre d'engagement demandé :
1. Constitution de l'ELP (GP = Hearst Management Co., LPs investisseurs).
2. Rédaction du PPM (Private Placement Memorandum) reflétant fidèlement Model B (principal en réserve, non déployé ; yield mining-derived).
3. Rédaction du LPA (Limited Partnership Agreement) avec les deux supplements de classe A/B.
4. Template de subscription agreement avec champ d'élection de classe.
5. Memo fiscal LP (équivalent K-1 / Cayman partner statement).
6. Cadrage des obligations AML / Travel Rule applicables (statut VASP éventuel côté Cayman).

Pourriez-vous nous transmettre :
- une timeline indicative (nous visons un closing structure sous 4–6 semaines, en parallèle d'un audit Spearbit du contrat dont le kickoff est ciblé au 2026-06-08) ;
- un devis (setup + frais récurrents annuels) ;
- la liste des informations KYB / GP que vous exigez pour ouvrir le dossier.

Vous trouverez en pièce jointe « asset-lifecycle.md » : le document de référence décrivant, ligne par ligne et au niveau du code, le cycle de vie d'1 USDC dans le vault (gel SHA 898991c6ee3c3bfe7637509ecee7ac579dc79388, audit OpenZeppelin v5.6.1 figé au commit 5fd1781 ; aucune correction issue de notre préparation d'audit ne touche contracts/src). Il est la source de vérité à utiliser pour la formulation Model B dans le PPM. Je vous adresserai séparément les ADR (001 structure Cayman, 008 share classes), la méthodologie v1.0 et nos trois pages légales actuelles à reviewer.

Je reste disponible pour un appel de cadrage cette semaine.

Bien cordialement,

Adrien
Founder & Owner, Hearst Corporation
adrien@hearstcorporation.io

Pièce jointe : asset-lifecycle.md
```

## Livrable 2 — Brief counsel complet

```markdown
# Brief Counsel — Hearst Yield Vault (Cayman ELP, Model B)

**Destinataire :** Maples and Calder (Cayman) — Investment Funds
**Émetteur :** Adrien, Founder & Owner, Hearst Corporation (adrien@hearstcorporation.io)
**Date :** 2026-05-29
**Référence code (gel) :** SHA 898991c6ee3c3bfe7637509ecee7ac579dc79388
**Dépendance contrat :** OpenZeppelin v5.6.1 figé au commit 5fd1781 ; aucune correction issue de la préparation d'audit ne touche contracts/src.
**Audit smart-contract :** Spearbit (primary), kickoff ciblé 2026-06-08

## 1. Structure de fonds

- **Véhicule :** Cayman Exempted Limited Partnership (ELP) — décision ADR-001, datée 2026-05-13.
- **General Partner :** Hearst Management Co. (GP de l'ELP, porteur du contrôle et du mandat de gestion).
- **Limited Partners :** investisseurs professionnels / qualifiés uniquement. Pas de retail.
- **Administrateur de fonds :** Apex ou Trident (admin handle KYC/KYB, NAV de fonds, registre des parts).
- **Auditeur :** Withum ou PwC.
- **Coûts de référence (ADR-001) :** setup ~$30–60k, running ~$30–50k/an.
- **Custody off-vault :** Fireblocks, workspace PROD, vault account 86 « Hearst Connect », clé Viewer read-only pour les attestations.

## 2. Classes de parts (ADR-008, datée 2026-05-26 — termes exacts)

| Champ | Class A | Class B |
|---|---|---|
| Code | A | B |
| Ticket minimum | $250 000 | $1 000 000 |
| Lock-up (soft) | 60 jours | 90 jours |
| Management fee | 1 % (100 bps) | 0,75 % (75 bps) |
| Performance fee | 10 % (1000 bps), High-Water Mark | 8 % (800 bps), High-Water Mark |
| LP cible | Institutionnel standard | Large allocator / capital patient |

Les deux classes mappent sur deux supplements de série sous le même master fund. La performance fee est calculée avec High-Water Mark par classe. La management fee est prélevée sur la NAV de la classe. Les classes A/B sont une différenciation de **frais** sur la même stratégie Yield Vault, pas un profil de risque distinct.

## 3. Model B — DESCRIPTION JURIDIQUE À REFLÉTER DANS LE PPM/LPA (non négociable)

**Le principal LP n'est jamais déployé on-chain. Il est custodié en réserve.** Faits établis et vérifiables au niveau du code (`HearstYieldVault.sol`, ERC-4626 + Ownable + Pausable, OpenZeppelin v5.6.1 figé au commit 5fd1781) :

1. **Principal = USDC en réserve dans le vault.** À chaque dépôt, l'USDC est transféré DANS le contrat et y reste. La NAV/part = totalAssets / totalSupply, où totalAssets = solde USDC du contrat. Pas d'oracle dans le calcul des parts ; `_decimalsOffset = 12` (parts 18 décimales, USDC 6 décimales). L'asset sous-jacent est l'USDC Base Sepolia `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, avec `minDeposit = 250000000000` (250 000 USDC, 6 décimales).
2. **Le manager ne peut PAS extraire le principal.** Le contrat n'expose aucune fonction de sortie de fonds vers une adresse autre qu'un actionnaire rachetant ses propres parts. Owner = `setMinDeposit` / `setGuardian` / `transferOwnership` uniquement. Guardian = `pause` / `unpause` uniquement. Aucun de ces rôles ne touche l'USDC. Worst-case owner+guardian compromis : peut bloquer de nouveaux dépôts, faire tourner le guardian, mettre en pause — jamais extraire.
3. **Mining financé OFF-VAULT.** Le mining Bitcoin est financé par le capital Hearst / SPV en dehors du vault. Le vault ne détient que de l'USDC — jamais de BTC, jamais de hardware, jamais de claim token.
4. **Yield = mining-revenue-share injecté mensuellement.** Le manager transfère de l'USDC issu des revenus mining DANS le vault (simple transfer ERC-20, pas une fonction du vault). La NAV monte automatiquement. Le LP supporte le risque de performance mining par le yield (yield moindre), pas par un principal déployé en risque.
5. **Redemptions toujours solvables en principal.** L'intégralité de l'USDC (principal + yield injecté) est dans le contrat ; le rachat brûle les parts et renvoie l'USDC au pro-rata.
6. **Lock-up et min-ticket = obligations OFF-CHAIN.** Le lock-up 60 j / 90 j et les minimums $250k / $1M ne sont pas des verrous on-chain : ce sont des obligations contractuelles LPA / subscription, opposables par le GP/admin off-chain.
7. **Proof of Reserve = advisory.** Attestations mensuelles signées (EIP-191) publiées dans PoRRegistry (append-only, 1 attestation/période YYYYMM). Ces données ne nourrissent JAMAIS le calcul des parts ; ce sont des preuves de reporting, pas du collatéral.

**Gouvernance des clés :** l'owner est un Safe multisig 3-sur-5 derrière un timelock de 48 h ; le guardian (pause/unpause uniquement) est une clé séparée, distincte des signataires du Safe. Aucun rôle ne peut extraire le principal, y compris en cas de compromission.

**Implication juridique centrale :** le PPM/LPA doit déclarer que le capital LP est détenu en USDC dans un vault ERC-4626 à titre de RÉSERVE, qu'il n'est PAS déployé on-chain, et que le yield est une distribution de revenue-share mining injectée par le manager. Les LP supportent le risque de performance mining via le yield, non via un déploiement de principal. Le headline « mining-backed yield » est exact à condition d'ajouter cette clarification.

## 4. Distributions

- **Cadence :** mensuelle, en USDC.
- **Mécanisme on-chain :** injection de l'USDC mining-derived dans le vault → hausse automatique de la NAV/part.
- **Scheduling :** off-chain (Inngest cron + admin).
- **APY :** TOUJOURS exprimé en range (cible 8–15 %), jamais en point unique. Range par classe. Le net APY décale d'environ 20–25 bps entre Class A et Class B à rendement brut comparable.

## 5. KYC / éligibilité (off-chain)

- **Identité :** Persona embed (template prod à provisionner ; sandbox actuel `itmplv_AmGWLdhN3movTqp6DMVVBvHQ6CDyrt`).
- **Signature documentaire :** DocuSign (compte na4 ; creds prod à provisionner).
- **Accréditation :** checkboxes Rule 506(c) + Cayman PIF, attestation horodatée persistée côté Investor.
- **Exécution :** la due diligence investisseur est exécutée off-chain et par l'administrateur de fonds (ADR-001).
- **Screening AML/sanctions et Travel Rule :** porté côté legal/ops, cadré avec Maples (cf. Liste des questions counsel, point 6).
```

## Livrable 3 — Liste des questions counsel

```markdown
# Questions Counsel — Hearst Yield Vault (réponse fermée requise)

1. **ELP vs SPC (multi-vault V2).** ADR-006 ouvre la voie à plusieurs vaults (Yield / Defensive / BTC Plus). Pour V1 mono-vault, l'ELP suffit-elle, ou recommandez-vous d'emblée une Segregated Portfolio Company (SPC) pour cloisonner les vaults futurs ? Confirmez ELP pour V1 et le chemin de migration vers SPC si multi-stratégie sous 12 mois.

2. **US persons.** Pour les investisseurs US, retenons-nous Regulation D Rule 506(c) (sollicitation générale, accredited investor verified) ou Rule 506(b) (pas de sollicitation générale), ou les excluons-nous entièrement de l'offre V1 ? ADR-008 mentionne 506(b) ; notre flow d'accréditation est câblé en 506(c). Tranchez la base à retenir et alignez le subscription agreement en conséquence.

3. **Formulation PPM de Model B.** Validez la formulation exacte à insérer au PPM : « LP capital is held as USDC in an ERC-4626 vault as a reserve, is not deployed on-chain, and yield is a mining-revenue-share distribution injected by the manager ; LPs bear mining performance risk through yield, not principal deployment. » Cette formulation est-elle suffisante au regard du disclosure standard Cayman, ou faut-il une section dédiée distincte ?

4. **Opposabilité du lock-up off-chain.** Le lock-up (60 j Class A / 90 j Class B) est purement contractuel (aucun verrou on-chain : le code permet un rachat à tout moment). Confirmez que la clause de lock-up « soft » est opposable au LP via le LPA et le subscription agreement, et précisez le remède contractuel en cas de demande de rachat anticipé (gate, refus, pénalité).

5. **Clauses fees / carry HWM.** Rédigez les clauses de management fee (1 % Class A / 0,75 % Class B sur NAV) et de performance fee avec High-Water Mark (10 % Class A / 8 % Class B). Confirmez la périodicité de crystallisation du carry et la mécanique HWM par classe à inscrire dans les supplements.

6. **AML / Travel Rule / statut VASP Cayman.** Le vault custodie de l'USDC on-chain. Le GP/SPV est-il un VASP au sens du Cayman VASP Act ? Quelles obligations AML et Travel Rule s'imposent, et lesquelles sont déléguables à l'administrateur de fonds versus à conserver en interne ? Indiquez le screening sanctions minimum exigé.

7. **Template subscription agreement.** Fournissez un template de subscription agreement incluant : champ d'élection de classe (A/B), attestation d'accréditation (506(c) + Cayman PIF), acknowledgment Model B (principal en réserve, non déployé), acknowledgment du lock-up soft.

8. **Memo fiscal — K-1 / partner statement.** L'ELP émet-elle un partner statement Cayman, ou un K-1 équivalent pour les LP US ? Fournissez le memo fiscal LP précisant le traitement des distributions mensuelles USDC (revenu vs retour de capital) et le reporting attendu par juridiction LP.
```

## Livrable 4 — Liste des documents à transmettre

```markdown
# Documents à transmettre à Maples

## Documents de référence produit/code (lecture seule, source de vérité)

1. **asset-lifecycle.md** — `docs/audit/spearbit-prep-2026-05-26/asset-lifecycle.md`. Cycle de vie d'1 USDC dans le vault, ancré au code (gel SHA 898991c6ee3c3bfe7637509ecee7ac579dc79388 ; OpenZeppelin v5.6.1 figé au commit 5fd1781 ; aucune correction ne touche contracts/src). PIÈCE JOINTE PRINCIPALE — source de la formulation Model B au PPM.
2. **ADR-001** — `docs/decisions/ADR-001-cayman-spv.md`. Décision de structure Cayman ELP (GP/LP, admin Apex/Trident, audit Withum/PwC, coûts).
3. **ADR-008** — `docs/decisions/ADR-008-share-classes.md`. Définition exacte des Class A / Class B (tickets, lock-up, fees, HWM, mapping supplements, note de conformité 506(b)).
4. **Methodology v1.0** — `docs/methodology/v1.0.md`. Méthode de projection APY (toujours en range), disclaimer templaté, immutable une fois publiée.
5. **Vision spec** — `docs/spec/00-vision.mdx`. Vision produit du Hearst Yield Vault.

## Pages légales actuelles à faire reviewer (recodées maison)

6. **Terms** — `src/app/legal/terms/`.
7. **Privacy** — `src/app/legal/privacy/`.
8. **Disclaimer** — `src/app/legal/disclaimer/`.

Ces trois pages constituent la surface légale publique actuelle ; Maples doit confirmer leur cohérence avec le PPM/LPA et avec la formulation Model B (principal en réserve, non déployé ; yield mining-derived).
```
