---
description: Audit sécurité — env vars, secrets, CSP, headers, injections
---

# /audit-security — Security Audit

## Objectif
Auditer les aspects sécurité du projet.

## Commande

### 1. Variables d'environnement
Vérifier que `src/lib/env.ts` valide toutes les variables avec Zod :
```bash
cat src/lib/env.ts
```

### 2. Pas de secrets hardcodés
```bash
rg -n '(api[_-]?key|secret|password|token).*=.*["\'][^"\']{8,}["\']' src/ --type ts --type tsx -i | grep -v 'env\.ts' | grep -v 'process\.env'
```
Résultat attendu : vide.

### 3. CSP headers
Vérifier les Content-Security-Policy dans `next.config.ts` :
```bash
rg -n 'csp|Content-Security-Policy|headers' next.config.ts
```

### 4. Pas de `dangerouslySetInnerHTML` sans sanitization
```bash
rg -n 'dangerouslySetInnerHTML' src/ --type tsx
```
Si trouvé, vérifier que le contenu est sanitizé (DOMPurify ou équivalent).

### 5. SQL injections (Prisma)
Vérifier qu'aucune requête SQL brute n'existe :
```bash
rg -n '\$queryRaw|\$executeRaw' src/ --type ts
```
Si trouvé, vérifier que les paramètres sont bindés.

### 6. Auth — admin gates
Vérifier que les routes admin sont protégées :
```bash
rg -n 'requireAdmin|requireAuth' src/app/admin/ --type ts --type tsx
```

### 7. Rapport
```
🔒 Security Audit Report
━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌ Env vars validées (Zod)
✅/❌ Pas de secrets hardcodés
✅/❌ CSP headers configurés
✅/❌ Pas de XSS (dangerouslySetInnerHTML)
✅/❌ Pas d'injections SQL
✅/❌ Routes admin protégées

Vulnérabilités : [liste]
Actions        : [corrections]
```
