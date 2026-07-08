# Natural Kiss — Plateforme

Outil de suivi **production-export** (fruits & légumes) augmenté par l'IA, construit
**brique par brique** autour d'un objet central : le **lot** (shipment).

Ce dépôt contient la **Brique 0 — Fondations** : squelette applicatif, socle de
données (M0) sur Supabase, design system bilingue, adaptateurs mock-first, feature
flags, tests et CI.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind v4 + shadcn/ui · Supabase
(Postgres, Auth, Storage, RLS) via `supabase-js` typé · Zod · next-intl (FR/EN) ·
Vitest · Playwright.

## Prérequis

- **Node 20.9+**
- **Docker** (pour Supabase en local)
- **Supabase CLI** (`brew install supabase/tap/supabase` ou https://supabase.com/docs/guides/cli)

## Démarrage rapide (Supabase local)

```bash
npm install
cp .env.local.example .env.local        # valeurs locales (voir plus bas)
npm run db                              # démarre Supabase local (Docker)
npm run db:reset                        # applique migrations + seed + fichiers Storage
npm run types                           # régénère src/lib/supabase/types.ts
npm run dev                             # http://localhost:3000
```

Pour `.env.local` en local, renseignez les valeurs affichées par `supabase status`
(`API URL`, `anon key`, `service_role key`).

## Brancher un projet Supabase **cloud**

Aucun changement de code : seule la configuration diffère.

1. Dans `.env.local`, mettez l'URL + les clés **du projet cloud**
   (`Project Settings → API`). La `service_role` key est un **secret serveur**.
2. Poussez le schéma vers le cloud :
   ```bash
   supabase link --project-ref <ref-du-projet>
   supabase db push                      # applique supabase/migrations/*
   ```
3. Types depuis le cloud :
   ```bash
   supabase gen types typescript --linked --schema public > src/lib/supabase/types.ts
   ```
4. Le seed (`supabase/seed.sql`) est destiné au **local** (`db reset`). En cloud,
   chargez les données de démo via une migration dédiée ou `psql`, puis
   `npm run seed` pour les fichiers Storage.

## Scripts npm

| Script                                  | Rôle                                                        |
| --------------------------------------- | ----------------------------------------------------------- |
| `npm run dev`                           | Serveur de dev Next.js                                      |
| `npm run build` / `start`               | Build & serveur de production                               |
| `npm run db`                            | `supabase start` (Supabase local)                           |
| `npm run db:reset`                      | `supabase db reset` (migrations + seed) puis `npm run seed` |
| `npm run types`                         | Génère les types TS depuis le schéma **local**              |
| `npm run seed`                          | Pousse les fichiers de démo dans Storage                    |
| `npm run lint` / `typecheck` / `format` | Qualité                                                     |
| `npm test`                              | Tests unitaires + intégration (Vitest, Supabase local)      |
| `npm run test:e2e`                      | Test E2E (Playwright)                                       |

## Architecture (Brique 0)

```
src/
  app/                     # App Router : layout (providers i18n/thème) + home
  components/
    brand/ layout/ home/ lots/ ui/   # design system + shadcn/ui
  i18n/                    # next-intl (FR/EN, sans routing — locale via cookie)
  lib/
    adapters/              # interfaces + mocks (Tracking/Sensor/FieldTrace/Email/Llm)
    data/                  # accès données typé (lots)
    supabase/              # clients (admin service-role, serveur anon, navigateur) + types générés
    env.ts                 # validation Zod des variables d'environnement
    feature-flags.ts       # activation par module/brique
    modules.ts             # registre des modules (M0→M10, T1→T5)
supabase/
  migrations/              # 0001 schéma M0 + RLS + grants · 0002 buckets Storage
  seed.sql                 # données de démo réalistes (dont cas « à problème »)
scripts/seed-storage.mjs   # upload des PDF de démo dans Storage
tests/                     # unit · integration · e2e
```

### Le socle de données (M0)

10 tables autour du lot : `clients`, `commandes`, `lots`, `transporteurs`,
`origines`, `documents`, `evenements_timeline`, `mesures_capteur`,
`rapports_qualite`, `preuves_produit`. **RLS activée partout** (deny par défaut) ;
l'accès interne passe par la **service role** (contourne la RLS) ; l'isolation
client du portail (Brique 4) est préparée (`clients.portail_user_id`,
fonction `public.current_client_id()`).

Buckets Storage : `documents`, `preuves`, `retours-qc`.

### Adaptateurs mock-first

Chaque source externe est derrière une interface, avec une implémentation `Mock`
par défaut (données calquées sur la base de connaissance) validée par Zod. Bascule
vers le réel via `NK_<SOURCE>_PROVIDER=real`, **sans toucher aux briques**.

### i18n

FR (interne, défaut) + EN, via next-intl **sans routing** : la locale est stockée
dans un cookie et se change depuis l'en-tête. Aucune duplication de routes.

## Definition of Done — Brique 0

- [x] L'app démarre et affiche la home, connectée à Supabase.
- [x] Migrations SQL créent le schéma M0 ; **RLS activée** ; types TS générés.
- [x] `db:reset` applique migrations + `seed.sql` (dont cas « à problème ») + Storage.
- [x] Interfaces d'adaptateurs + implémentations mock en place.
- [x] Feature flags fonctionnels.
- [x] `lint`, `typecheck`, tests unitaires + intégration verts.
- [x] 1 test E2E « l'app charge et lit un lot depuis Supabase ».
- [x] README technique présent.

## Vérification manuelle

1. `npm run db` puis `npm run db:reset` → base peuplée (Supabase Studio local :
   http://127.0.0.1:54323).
2. `npm run dev` → la home liste les lots issus de Supabase (dont `CAAU4027760`,
   le lot rejeté `OLMP2605160`, le conteneur incohérent `OTPU6220580`).
3. `npm test` et `npm run test:e2e` → tout est vert.
