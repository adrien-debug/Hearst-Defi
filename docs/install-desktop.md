# Hearst Connect — Installation Desktop (macOS)

App signée par **Profit-Exchange (3CU82K426J)** et notarisée par Apple. Aucune
alerte Gatekeeper, aucun contournement à faire.

## Quel fichier télécharger ?

| Ton Mac | Fichier |
|---|---|
| **Apple Silicon** — M1, M2, M3, M4 (≥ 2020) | `Hearst Connect-<version>-arm64.dmg` |
| **Intel** (Mac antérieur à 2020) | `Hearst Connect-<version>.dmg` |

Si tu ne sais pas : menu  → **À propos de ce Mac**. Si tu vois « Apple M… » =
Apple Silicon. Si tu vois « Processeur Intel… » = Intel.

## Installation (30 secondes)

1. **Double-clique** sur le `.dmg` téléchargé.
2. Glisse l'icône **Hearst Connect** dans le dossier **Applications**.
3. Ouvre **Applications → Hearst Connect**.

C'est tout. L'app charge `connect.hearst.app` et te demande de te connecter.

## Compatibilité

- macOS **11 Big Sur** ou plus récent.
- Connexion Internet requise (l'app est un client qui parle au backend `connect.hearst.app`).

## Mises à jour

Les versions suivantes s'installent **automatiquement en arrière-plan**. Une notification
s'affichera quand une mise à jour est prête, et l'app redémarrera pour l'appliquer.

## En cas de problème

- **Écran blanc / "impossible de se connecter"** : vérifie ta connexion Internet. Si
  ça persiste, c'est probablement un incident côté serveur — réessaie dans quelques minutes.
- **L'app refuse de s'ouvrir** : impossible si tu l'as téléchargée depuis la source
  officielle. Vérifie que le fichier n'a pas été modifié pendant le transfert (re-télécharge).
- **Désinstaller** : glisse `Applications/Hearst Connect` dans la Corbeille.

## Confidentialité & sécurité

- L'app n'embarque **aucune clé privée** ni secret — tout vit sur le serveur.
- Communications **HTTPS uniquement** (`connect.hearst.app`).
- Signature `Developer ID Application: Profit-Exchange (3CU82K426J)`, vérifiable :
  ```
  codesign -dv --verbose=2 "/Applications/Hearst Connect.app"
  ```
