# Natural Kiss — Plateforme

Outil de suivi **production-export** (fruits & légumes) augmenté par l'IA, construit
**brique par brique** autour d'un objet central : le **lot** (shipment).

Briques livrées :

- **Brique 0 — Fondations** : squelette, socle de données (M0) Supabase, design
  system bilingue, adaptateurs mock-first, feature flags, tests, CI.
- **Brique 1 — P0 tracking (M7)** : tout le voyage d'un conteneur par son numéro.
- **Brique 2 — Objet Lot** : liste filtrable + fiche 360°.
- **Brique 3 ⭐ — Documents & Conformité + Gate (M6)** : dépôt de documents,
  **vérificateur IA** de cohérence croisée, **checklist de conformité** pays/produit,
  et **Gate « Check OK »** qui verrouille l'expédition jusqu'au tout-vert — au vert,
  **mail (mock)** au client/broker, tracé.
- **Brique 4 — Chargement & Portail client (M5 + T1)** : preuve produit au
  chargement (photo boîte / QR), portail client isolé par RLS.
- **Brique 5 — Dashboard & Planning (T3 + M3)** : KPIs de service, planning
  prévu / réalisé.
- **Brique 6 — Hub email & IA + Qualité client (T2 + M9)** : **import automatique
  du PDF de retour** depuis les mails (mock `EmailProvider`), **analyse IA**
  (`QcAnalyzerProvider` → défauts catégorisés, score, verdict, validés par Zod),
  rattachement au lot par n° de conteneur, comparaison **photo boîte départ ↔
  retour**, et **tendances qualité** par produit / client / site.
- **Brique 7 — Demande & Onboarding + Certifications (M1 + M2 + M0c)** :
  **onglet Demande** (produit × pays × client) avec **matching automatique des
  certifications** contre le **coffre M0c** (`certifications`, couverture
  produit/pays + validité). Suffisant → **envoi auto** (mock `EmailProvider`) du
  pack + certifs ; insuffisant → **alerte + workflow de correction**
  (`taches_correction`). Décision + raison **tracées** ; **alertes d'expiration**
  des certifs ; **création de l'espace client** (Supabase Auth + `client_users`,
  Brique 4).
- **Brique 8 — Complétude du flux (M0b + M10 + T4 + T5)** : connecteur Cropwise
  (traçabilité champ multi-sites), finance légère (paiements, litiges,
  certificats de destruction), copilote IA (résumé de fils d'emails) et moteur
  d'alertes proactives (retard navire, excursion température, document manquant).
- **Brique 9 — Booking (M4)** : **dossier de réservation** généré en un clic
  (texte standardisé, copiable vers n'importe quel canal — transporteur direct,
  broker, transitaire, téléphone) et **point d'entrée unique de confirmation**
  (n° de conteneur, transporteur, date de départ) qui fait naître le **lot** —
  manuellement ou pré-rempli par lecture IA d'un mail de confirmation
  (`BookingConfirmationProvider`). Réservation directe possible sans dossier
  préalable (canal traité entièrement hors outil).

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
5. Pour les données de démo **Gate** (Brique 3 : métadonnées documentaires +
   pièces manquantes), un top-up idempotent via la service role est fourni :
   `node scripts/seed-gate.mjs` (aligné sur `supabase/seed.sql`).
6. Pour les données de démo **Demande & Onboarding** (Brique 7 : coffre M0c +
   demande « mangue → UK »), un top-up idempotent est fourni :
   `node scripts/seed-onboarding.mjs` (aligné sur `supabase/seed.sql`, inclus
   dans `npm run seed`).

## Scripts npm

| Script                                  | Rôle                                                              |
| --------------------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                           | Serveur de dev Next.js                                            |
| `npm run build` / `start`               | Build & serveur de production                                     |
| `npm run db`                            | `supabase start` (Supabase local)                                 |
| `npm run db:reset`                      | `supabase db reset` (migrations + seed) puis `npm run seed`       |
| `npm run db:push`                       | `supabase db push` (applique les migrations sur le **cloud** lié) |
| `npm run types`                         | Génère les types TS depuis le schéma **local**                    |
| `npm run types:cloud`                   | Génère les types TS depuis le schéma **cloud** lié                |
| `npm run seed`                          | Pousse les fichiers de démo dans Storage + top-ups (portail, planning, onboarding) |
| `node scripts/seed-gate.mjs`            | Top-up idempotent des données de démo Gate (cloud, service role)  |
| `node scripts/seed-onboarding.mjs`      | Top-up idempotent du coffre certifs + demande démo (Brique 7)     |
| `node scripts/seed-booking.mjs`         | Top-up idempotent des dossiers de réservation démo (Brique 9)     |
| `npm run lint` / `typecheck` / `format` | Qualité                                                           |
| `npm test`                              | Tests unitaires + intégration (Vitest, Supabase local)            |
| `npm run test:e2e`                      | Test E2E (Playwright)                                             |

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

## Definition of Done — Brique 9 (Booking — M4)

- [x] Constat de cadrage : le **canal de réservation varie** (transporteur direct,
      broker, transitaire, téléphone…) — l'outil ne l'impose pas. Séparation
      **demande** (sortante, variable) / **confirmation** (entrante, un seul geste).
- [x] `/booking` — **Nouvelle demande** : génère un **dossier de réservation**
      standardisé (`demandes_booking.dossier_texte`, logique pure testable dans
      `lib/booking/rules.ts`), copiable vers n'importe quel canal.
- [x] **Registre des dossiers** (brouillon → envoyé → confirmé) : copier le
      dossier, marquer envoyé, ou confirmer directement depuis la liste.
- [x] **Point d'entrée unique de confirmation** (`confirmBooking`) : 3 champs
      (n° de conteneur, transporteur, date de départ) → **crée le lot**
      (`lots`, statut `booking`) et marque le dossier `confirme` — **idempotent**
      (reconfirmer renvoie le lot déjà créé).
- [x] **Transporteur inconnu** du référentiel (M0) → ajouté à la volée
      (`resolveTransporteur`) : le canal étant trop variable pour une liste fermée.
- [x] **Réservation directe** possible sans dossier préalable (canal traité
      entièrement hors outil).
- [x] **Pré-remplissage IA** de la confirmation : coller le texte d'un mail de
      confirmation (peu importe l'expéditeur) → `BookingConfirmationProvider`
      (mock déterministe → LLM réel) extrait n° conteneur / transporteur / date,
      validé par Zod ; la saisie manuelle reste toujours prioritaire.
- [x] Migration SQL `0009` (`demandes_booking` + enum `booking_statut`) + **RLS** ;
      types TS régénérés (cloud) ; `seed.sql` + `scripts/seed-booking.mjs` (cloud)
      enrichis (3 dossiers : brouillon SHP mangue, envoyé Barfoots Tenderstem,
      confirmé Exo3 ail → déjà lié à `LOT-2026-0005`).
- [x] Tests **unitaires** (dossier généré, référence de lot, extraction IA mock) +
      **intégration** (création → confirmation → idempotence → transporteur
      ajouté) + **3 E2E** (registre, nouvelle demande, réservation directe).
- [x] `lint`, `typecheck`, tests verts ; feature flag `BOOKING` ; aucune régression.

> Bascule vers un vrai LLM : `NK_LLM_PROVIDER=real` (adaptateur), sans toucher
> à la brique.

## Definition of Done — Brique 7 (Demande & Onboarding + Certifications)

- [x] **Onglet Demande** (`/demande`) : réception d'une demande (produit × pays ×
      client) + qualification automatique.
- [x] **Coffre certifications (M0c)** `certifications` : GGAP, GRASP, BRCGS, SMETA,
      Sedex avec couverture produit/pays + validité ; **alertes d'expiration**.
- [x] **Matching auto** (logique pure, testable) : « mangue → UK » → **manque
      GGAP/GRASP mangue** → alerte + **workflow de correction** (`taches_correction`) ;
      « brocoli → UK » → certifs OK → **envoi auto** (mock `EmailProvider`) du pack.
- [x] **Traçabilité** de la décision (suffisant / insuffisant + raison) en base ;
      matching **strictement** basé sur la table `certifications` (pas d'invention).
- [x] **Onboarding (M2)** : création de l'espace client (Supabase Auth +
      `client_users`, Brique 4), idempotente.
- [x] Migration SQL `0007` + **RLS** ; types TS régénérés ; `seed.sql` enrichi
      (coffre + demande « mangue → UK ») + `scripts/seed-onboarding.mjs` (cloud).
- [x] Tests **unitaires** (matching, couverture, expiration) + **intégration**
      (demande → décision → envoi/alerte → onboarding) + **1 E2E** (`/demande`).
- [x] `lint`, `typecheck`, tests verts ; feature flag `ONBOARDING` ; aucune régression.

> Bascule vers une vraie boîte mail : `NK_EMAIL_PROVIDER=real` (adaptateur), sans
> toucher à la brique.

## Definition of Done — Brique 6 (Hub email & IA + Qualité client)

- [x] Un mail mock avec PDF → **PDF importé et rattaché au lot** (par n° de
      conteneur / réf. dans le sujet ou le nom du fichier), tracé dans
      `qualite_imports` — **idempotent** (clé `email_id`).
- [x] **Analyse IA** (`QcAnalyzerProvider` mock déterministe → LLM réel) validée
      par Zod : `QCCheck_986640` → défauts « floraison / tiges creuses », score
      **84**, flag **rouge** ; défauts catégorisés (aspect/maturité/calibre/…) +
      sévérité, stockés dans `rapports_qualite.analyse_ia`.
- [x] Comparaison **photo boîte départ (Brique 4) ↔ retour arrivée** dans la fiche
      lot (onglet Qualité).
- [x] **Tendances qualité** par produit / client / site (`/qualite`) : répartition
      des verdicts, score moyen, défauts récurrents.
- [x] Migration SQL `0006` + **RLS** ; types TS régénérés ; `seed.sql` enrichi
      (analyses calquées sur les vrais PDF QC).
- [x] Tests **unitaires** (extraction réf. / verdict / scoring / tendances) +
      **intégration** (import → analyse → fiche → tendances, idempotence) +
      **1 E2E** (mail → analyse → fiche lot).
- [x] `lint`, `typecheck`, tests verts ; aucune régression.

> Bascule vers un vrai LLM / une vraie boîte mail : `NK_LLM_PROVIDER=real` et
> `NK_EMAIL_PROVIDER=real` (adaptateurs), sans toucher aux briques.

## Definition of Done — Brique 3 (Documents & Conformité + Gate) ⭐

- [x] Dépôt de documents par lot (upload Storage + rattachement + métadonnées).
- [x] **Vérificateur IA** (`DocVerifierProvider` mock déterministe → LLM réel) :
      cohérence croisée (n° conteneur, poids, code HS, quantités) → anomalies
      **validées par Zod**.
- [x] **Checklist de conformité** pays/produit : Déclaration Additionnelle UE,
      règlement (UE) 2021/2285 (slips), code HS, couverture GGAP/GRASP, preuve produit.
- [x] **Gate « Check OK »** : vue `lot_gate_status` (vert/rouge/en_attente) ; bloque
      tant qu'anomalie bloquante ou conformité en échec.
- [x] Au vert → **mail (mock)** au client/broker via `EmailProvider`, tracé dans
      `gate_journal`.
- [x] Migration SQL + **RLS** ; types TS régénérés ; `seed.sql` enrichi (jeu cohérent
      → vert, jeu incohérent → rouge, Déclaration Additionnelle manquante).
- [x] Tests **unitaires** (cohérence + conformité + statut) + **intégration** + **1 E2E**
      (dépôt → anomalie → blocage ; cohérent → vert + mail).
- [x] `lint`, `typecheck`, `format` OK ; aucune régression.

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
