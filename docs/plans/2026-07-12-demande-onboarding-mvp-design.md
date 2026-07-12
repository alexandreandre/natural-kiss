# Design — MVP « Demande → Certifs → Onboarding → Espace client »

- **Date** : 2026-07-12
- **Statut** : validé (Approche A), prêt pour le plan d'implémentation
- **Objectif** : MVP démontrable à Valentin & Nico montrant **le flow de bout en bout**,
  du POV client jusqu'à l'espace client. Templates de documents volontairement
  simples — le contenu exact sera précisé par le client après la démo.

---

## 1. Contexte & découverte

La fonctionnalité demandée (« un client demande un produit pour un pays → l'outil
vérifie la couverture des certifications → si oui envoi auto du pack, si non alerte
→ à la validation, onboarding + création de l'espace client ») **existe déjà à ~70 %**
dans le repo sous le nom **Brique 7 (M1 / M2 / M0c) — « Demande & Onboarding »**
(flag `ONBOARDING: true`, testée unit + intégration + e2e).

Ce qui **existe déjà** (à réutiliser tel quel) :

- Matching certifications produit × pays : `src/lib/onboarding/rules.ts`
  (`matchDemande`, `requiredCertifs`, `certCovers`, alertes d'expiration).
- `createDemande()` : exécute le matching, **envoie le pack par email (mock)** si
  suffisant, crée les `taches_correction` si insuffisant — `src/lib/onboarding/service.ts`.
- Page interne `/demande` : formulaire, liste des demandes + décision, bouton
  onboarding, coffre M0c — `src/app/demande/page.tsx`.
- Onboarding `onboardDemande()` : crée la fiche `clients`, provisionne l'utilisateur
  Supabase Auth, le rattache via `client_users`, marque la demande.
- Portail client `/portail` isolé par **RLS** (magic link, `current_client_ids()`).
- Coffre M0c + demande démo « Mangue → UK » (insuffisant) déjà seedés.

Les **3 trous** que ce MVP comble :

1. **Point d'entrée client** : `/demande` est une console **interne** (équipe NK).
   Il manque une page **publique** où le **client** soumet lui-même sa demande.
2. **Documents à l'onboarding** : `onboardDemande()` **ne génère aucun document et
   n'envoie pas d'email d'onboarding**. Le README promet « l'outil crée les documents
   et les envoie par mail ».
3. **Visibilité de l'espace client** : le portail liste les lots mais **pas** les
   documents d'onboarding.

Sources métier (docs/ + export Slack de Valentin) confirmant les cas de démo :
**Mangue = trou de certification connu** (GGAP/GRASP couvrent brocoli/fraise/patate
douce mais **pas la mangue** — cas SHP Tropical) ; **pack Barfoots** = SMETA + BRCGS +
Sedex + GGAP + GRASP pour l'UK.

---

## 2. Périmètre (ce qu'on livre)

Approche **A** — étendre la Brique 7 en une tranche verticale complète. Quatre briques
fines :

### a) Page publique client — `/nouvelle-demande`

Route **publique** (hors auth ; le `middleware.ts` ne fait que rafraîchir la session
portail, il ne bloque rien). Formulaire minimal : société, email, **produit** (liste
déroulante : Brocoli/Tenderstem, Patate douce, Fraise, Ail, Mangue…), **pays** (UK,
France, Pays-Bas, Russie…), volume optionnel. Server action → appelle le
`createDemande()` **existant** (matching + email pack déclenchés automatiquement).
Écran de confirmation **neutre** (« Demande reçue, nous revenons vers vous ») — on ne
révèle pas le résultat du matching au client (comportement métier réel).

### b) Génération des documents à l'onboarding

Extension de `onboardDemande()` : après création du client + accès portail, génération
de **3 documents templates simples** (contenu HTML, placeholders réalistes) :

1. **Lettre de bienvenue & accès à votre espace** (lien portail).
2. **Récapitulatif de nos certifications** (le « pack certif » couvrant le produit).
3. **Fiche produit & prochaines étapes** (produit / pays demandés).

Persistés dans une nouvelle table **`documents_onboarding`** (client-scopée), puis
« envoyés » via un **email d'onboarding** (mock).

### c) Boîte d'envoi démo

Les emails mockés (pack certif + onboarding) sont journalisés dans **`emails_envoyes`**
et affichés dans un panneau **« Emails envoyés (démo) »** sur `/demande`. Rend l'envoi
automatique **visible** sans vrai serveur mail.

### d) Espace client enrichi

Section **« Vos documents »** sur `/portail` listant les documents d'onboarding du
client (RLS), chacun ouvrable en page lisible/imprimable `/portail/documents/[id]`.
Le suivi des lots reste affiché en dessous.

---

## 3. Le flow (démo)

```
CLIENT (page publique)          INTERNE NK (/demande)             ESPACE CLIENT (/portail)
────────────────────            ─────────────────────             ────────────────────────
1. produit + pays + email  ─▶   2. demande + matching auto
   (ex. Mangue → UK)                ├─ suffisant → pack email
                                    └─ insuffisant → alerte "manque X"
                                 3. « Créer l'espace client » (si suffisant)
                                    ├─ génère 3 documents
                                    ├─ email d'onboarding (mock)
                                    └─ crée l'accès portail  ─────▶  4. connexion magic link,
                                                                        docs + suivi lots
```

Deux cas prêts : **Mangue → UK** = insuffisant (alerte GGAP/GRASP, déjà seedé) ;
**Brocoli/Tenderstem → UK** = suffisant → onboarding complet.

---

## 4. Modèle de données (migration `0010`)

- **`documents_onboarding`** : `id`, `client_id` (FK `clients`), `demande_id`
  (FK `demandes`, null), `type` (enum `bienvenue | certifs | produit`), `titre`,
  `contenu_html text`, `created_at`.
  **RLS** : `SELECT` pour `authenticated` où `client_id in (select current_client_ids())`
  (même pattern que le portail) ; écritures **service-role uniquement** (aucune policy
  insert/update/delete).
- **`emails_envoyes`** : `id`, `categorie` (enum `pack_certif | onboarding`),
  `to_email`, `subject`, `body`, `demande_id` (null), `client_id` (null), `created_at`.
  Interne : RLS activée **sans policy** (deny), lu via service-role sur `/demande`.
- Régénérer les types TS (`src/lib/supabase/types.ts`).
- Enrichir `supabase/seed.sql` : un client déjà onboardé + ses 3 documents (pour que
  `/portail` ne soit pas vide en démo), et log outbox correspondant.

---

## 5. Réutilisé tel quel (aucune réécriture)

`matchDemande()` + alertes, coffre M0c, `createDemande()` (email pack inclus),
provisionnement portail (`client_users` + magic link), isolation RLS
(`current_client_ids()`), feature flags. On **branche** sur l'existant.

Note : l'isolation portail passe par `client_users` (pas `clients.portail_user_id`,
qui reste un repli hérité) — les policies RLS des nouveaux documents doivent donc
utiliser `current_client_ids()`.

---

## 6. Tests (Definition of Done de la brique)

- **Unit** : fonction **pure** de génération des templates
  (`client + produit + pays + certifs → { type, titre, contenu_html }[]`).
- **Intégration** (Supabase local) : `onboardDemande` crée bien les 3 documents +
  l'entrée outbox + l'email d'onboarding ; **RLS** : un client ne voit que **ses**
  documents (un autre client → 0).
- **E2E** (Playwright) : page publique `/nouvelle-demande` → soumission Mangue → UK
  (alerte visible côté interne) et Brocoli → UK (suffisant) → onboarding → documents
  visibles dans `/portail`.

Qualité : `lint`, `typecheck`, `format:check` verts ; feature flag respecté ; aucune
régression sur les tests existants.

---

## 7. Hors scope (évolutions futures, assumées)

- Vrais **PDF** (ici : HTML imprimable via le navigateur) et **email réel**
  (ici : mock via `EmailProvider`, swap `NK_EMAIL_PROVIDER=real` plus tard sans
  toucher aux briques).
- Raffinements métier issus du Slack de Valentin, volontairement écartés du MVP :
  - certifications rattachées au **site** (grower El Saada / packhouse Al Batoul) et
    non à l'exportateur ; codes pivots GGN / BRC / Sedex ZC-ZS ;
  - **whitelist d'organismes certificateurs par client** (LSQA rejeté par Barfoots) ;
  - **approbation par paliers** (« limited customers / test container » → « full
    customer base ») et **par client final** (Lidl, food service) ;
  - **pack partiel toléré** à l'onboarding (« just send what you have ») ;
  - pack **documentaire par expédition** (phyto + Additional Declaration + EUR1 +
    packing list…) avec checklist réglementaire pré-envoi.

---

## 8. Points d'attention

- **Route publique** : `/nouvelle-demande` ne doit exiger aucune session ; réutiliser
  `createDemande` côté serveur (service-role) via une server action dédiée.
- **Documents client-scopés** : la table `documents` existante est **lot-scopée** ;
  d'où la nouvelle table `documents_onboarding` client-scopée (ne pas mélanger).
- **i18n** : ajouter les clés FR **et** EN (page publique, section documents portail,
  panneau outbox).
- **Idempotence** : `onboardDemande` est idempotent ; la génération de documents doit
  l'être aussi (ne pas dupliquer les 3 docs si on ré-onboarde).
- **Feature flag** : réutiliser `ONBOARDING` pour la page publique et l'outbox.
