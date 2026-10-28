@AGENTS.md
@HANDOFF.md

- Interface et documentation en français ; l'utilisateur (expert-comptable) a un niveau code très limité : expliquer en langage métier.
- Garder le design identique à Fiscalis (shadcn/ui base-nova, jetons de `src/app/globals.css`).
- Données : passer par `src/lib/data/index.ts` ; ne jamais écrire de secret dans le code (utiliser `.env.local`).
