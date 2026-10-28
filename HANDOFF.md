# HANDOFF — Dossier de travail (Audit CPA)

> À lire en premier pour reprendre le projet (humain ou Claude Code).

## Contexte

- **Demandeur** : Yann Jammes, expert-comptable associé, Audit CPA (Groupe CPA). Niveau code très limité : expliquer en langage métier, livrer clé en main.
- **Objectif** : outil web d'analyse des dossiers clients à partir de Pennylane (API + MCP), dans le même environnement que **Fiscalis** (`https://fiscalis.audit-cpa.net`).
- **État** : prototype complet et cliquable, **données fictives** (octobre 2026). Branchements Pennylane / SharePoint / Claude préparés mais non activés.
- **Emplacement** : `C:\Dev\dossier-de-travail` (hors OneDrive, comme le projet Dashboard-SVV : `node_modules` ne doit pas être synchronisé). Un pointeur est dans `OneDrive\Documents\Claude Code\Outil dossier annuel`.

## Décisions validées avec Yann

| Sujet | Décision |
|---|---|
| Nom | **Dossier de travail** (affiché « cpa. / Dossier de travail ») |
| Design | Copie de Fiscalis : shadcn/ui `base-nova`, palette neutre, rayon 0.625rem, Geist / Geist Mono, logo `cpa` + point `sky-500`, en-tête avec sélecteur « Choisir une société… », cloche, réglages, déconnexion |
| Navigation | Façon Pennylane avec le design Fiscalis : colonne de sections + panneau de sous-pages (épinglable, sinon en survol) |
| Arborescence | Accueil · Production (Paramétrage, Dossiers annuels, Supervision) · Analyse · Documents · GED · Utilisateurs · Admin |
| Documents | Documents fiscaux récupérés dans Pennylane |
| GED | GED Pennylane + SharePoint Microsoft |
| Non retenus (proposés) | Échéancier, sous-menus Analyse, Admin enrichi (Référentiels, Journal) → l'analyse est en onglets dans la page, l'admin tient sur une page |

## Stack (identique à Fiscalis)

Next.js 16.3 (App Router, Turbopack) · React 19.2 · TypeScript · Tailwind CSS 4 · shadcn/ui `base-nova` (composants Base UI : `render={...}` au lieu de `asChild`, `nativeButton={false}` pour un bouton-lien) · lucide-react · recharts (via `components/ui/chart`) · zustand (mémoire de démo dans le navigateur) · `@anthropic-ai/sdk` (assistant, non activé).

Node.js portable : `C:\Users\YannLOUTF-JAMMES\AppData\Local\nodejs` (pas de droits admin).

## Arborescence du code

```
src/app/(app)/…            pages avec le cadre (en-tête + navigation)
src/app/connexion          écran de connexion (démo)
src/app/api/assistant      route serveur de l'assistant IA (503 tant que non configurée)
src/components/layout      en-tête, navigation Pennylane (nav-config.ts = arborescence), sélecteur de société, notifications, lanceur d'applis CPA
src/components/common      briques : titres de page, statuts, filtres, pagination, barres d'avancement
src/components/{home,production,analyse,documents,ged,admin}   écrans
src/lib/data               DONNÉES DE DÉMO (générées, déterministes) — point d'entrée : index.ts
src/lib/integrations       connecteurs réels préparés : pennylane.ts, sharepoint.ts, assistant.ts
src/lib/analysis.ts        ratios, variations significatives, points d'attention
src/lib/assistant.ts       réponses de l'assistant en démo
src/lib/store.ts           mémoire de démo (localStorage) ; src/lib/hooks.ts fusionne données + mémoire
scripts/check-data.ts      contrôle des données de démo (balances équilibrées) : npx tsx scripts/check-data.ts
```

## Données de démo

- 30 dossiers fictifs (SIREN volontairement invalides), 10 collaborateurs (seul Yann est réel), date de référence fixe **05/10/2026** (`DEMO_NOW`).
- Balance N / N-1 générée par profil d'activité, **équilibrée**, capitaux propres N = N-1 + résultat − distributions (`balance.ts`).
- Scénario de production (`scenario.ts`) : clôtures 31/12/2025 déposées (sauf 2 en retard), clôtures 30/06/2026 en cours (échéance 15/10/2026), clôtures 30/09/2026 non démarrées.
- 15 contrôles automatiques (`checks.ts`), chacun relié à l'outil MCP Pennylane qui l'alimentera.

## Mise en production — étapes

1. **Accès** : jeton Firm API Pennylane en lecture seule ; URL + jeton du MCP Pennylane ; clé API Anthropic ; application Entra ID (`Sites.Selected`) pour SharePoint. Tout dans `.env.local` (modèle `.env.example`).
2. **Données** : remplacer les fonctions de `src/lib/data/index.ts` par des appels à `src/lib/integrations/pennylane.ts` (commencer par la balance → `getFinancials`), avec une synchronisation nocturne + bouton « Synchroniser ».
3. **Persistance** : remplacer `store.ts` (navigateur) par une base de données (contrôles cochés, revues, commentaires, points en suspens, paramétrage).
4. **Assistant** : faire appeler `/api/assistant` par `components/analyse/assistant-view.tsx` (modèle `claude-opus-5-5`, MCP en liste blanche lecture seule, repli serveur `fallbacks: "default"` activé).
5. **Sécurité** : connexion Microsoft 365 obligatoire (comme Fiscalis), rôles de `users.ts`, protection des routes API.
6. **Hébergement** : même environnement que Fiscalis (à voir avec la personne qui l'héberge) ; liens profonds vers Fiscalis possibles avec le vrai SIREN (`/s/{siren}/messages`).

## Points d'attention techniques

- Pas de `useSearchParams` : les paramètres d'URL sont lus côté serveur (`searchParams`) et passés en props. Avec React 19.2, les zones `Suspense` diffusées ne s'hydratent pas dans un onglet masqué (révélation par `requestAnimationFrame`).
- Les dates sont formatées en `Europe/Paris` ; les « il y a … » se calculent par rapport à `DEMO_NOW` (à remplacer par l'heure réelle en production).
- `npm run build` et `npm run lint` passent sans erreur (dernière vérification : 05/10/2026).
