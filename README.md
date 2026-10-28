# Dossier de travail — Audit CPA

Outil web d'**analyse des dossiers clients** à partir des données **Pennylane**, dans le même environnement visuel que **Fiscalis** (logo `cpa.`, polices et composants identiques).

> **Prototype** : toutes les sociétés, tous les chiffres et tous les documents sont **fictifs**. Le branchement à Pennylane, SharePoint et à l'IA est préparé dans le code mais pas activé.

---

## Lancer la démo

1. Double-cliquer sur **`Lancer-la-demo.cmd`** (dans ce dossier).
2. Attendre l'ouverture du navigateur sur <http://localhost:3000> (la première ouverture peut prendre une minute).
3. Pour arrêter : fermer la fenêtre noire.

Vos manipulations (contrôles cochés, commentaires, points ajoutés…) sont gardées dans le navigateur. Pour repartir de zéro : **Admin › Réinitialiser la démo**.

---

## Ce que contient l'application

| Menu | À quoi ça sert |
|---|---|
| **Accueil** | Mes dossiers en cours, mes tâches, les alertes d'analyse et l'activité récente |
| **Production › Paramétrage** | Fiche de chaque dossier : mission, équipe, seuils, liaisons Pennylane / SharePoint / Fiscalis |
| **Production › Dossiers annuels** | Suivi de la révision : cycles et contrôles à cocher, visa de revue, points en suspens, historique, workflow (démarré → en revue → validé → déposé) |
| **Production › Supervision** | Vue cabinet : avancement par collaborateur, liasses déposées par mois, dossiers à risque, échéances |
| **Analyse** | Par dossier : synthèse (SIG, ratios, CA mensuel), revue analytique N / N-1 avec seuils, 15 contrôles automatiques, assistant IA |
| **Documents** | Documents fiscaux récupérés depuis Pennylane (liasses, TVA, IS, CVAE, DAS2) |
| **GED** | Documents du dossier : GED Pennylane + dossiers SharePoint du cabinet |
| **Utilisateurs** | Collaborateurs, rôles et droits |
| **Admin** | Connexions (Pennylane, SharePoint, Claude, Fiscalis), synchronisations, paramètres |

La navigation reprend le principe de Pennylane : une colonne de sections et, pour **Production**, un panneau de sous-pages qu'on peut **épingler** (icône `|<`) ou ouvrir au survol.

---

## Passer des données fictives aux vraies données

Voir **`HANDOFF.md`** (section « Mise en production »). En résumé :

1. Créer les accès (jeton Pennylane en lecture seule, clé API Anthropic, application Microsoft pour SharePoint).
2. Les renseigner dans un fichier `.env.local` (modèle : `.env.example`) — **jamais** dans le code.
3. Remplacer les générateurs de démo (`src/lib/data/`) par les connecteurs (`src/lib/integrations/`).
4. Mettre en ligne (même hébergement que Fiscalis) avec la connexion Microsoft du cabinet.

---

## Pour les développeurs

- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui « base-nova » (Base UI) — identique à Fiscalis
- `npm run dev` (développement) · `npm run build` (vérification de production) · `npm run lint`
- Détails techniques, modèle de données et choix : `HANDOFF.md`
