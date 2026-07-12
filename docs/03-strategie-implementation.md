# Natural Kiss — Stratégie d'implémentation (brique par brique, testable)

> **Objet** : définir la meilleure stratégie pour construire la plateforme **pas à pas**, de façon à pouvoir **tester, vérifier et compléter chaque brique** avant de passer à la suivante.
> **S'appuie sur** : `NATURAL_KISS_Plateforme_Architecture.md` (modules M0→M10, T1→T5) et `NATURAL_KISS_Knowledge_Base.md` (douleurs réelles).
> **Nature** : stratégie de mise en œuvre. Décisions techniques recommandées + rationnel ; à valider avant d'écrire du code.
> **Date** : 8 juillet 2026.

---

## 1. Philosophie : « tranches verticales », mock-first, à cliquet

Trois principes non négociables pour que **chaque brique soit testable et vérifiable** :

1. **Tranche verticale, pas horizontale.** Chaque brique livre une **fonctionnalité utilisable de bout en bout** (UI → logique → données), pas une couche technique isolée. On peut la démontrer, la valider, puis passer à la suivante.
2. **Mock-first avec adaptateurs.** Toutes les sources externes (MarineTraffic, FlightRadar, Cropwise, datalogger, email, LLM) sont derrière une **interface d'adaptateur**. On démarre avec des **implémentations "mock" réalistes** (données calquées sur la base de connaissance) ; on branche le vrai service plus tard **sans réécrire** la brique. C'est ce qui permet de tester tout de suite, sans clés API.
3. **À cliquet (ratchet).** Une brique n'est "terminée" que si elle passe sa **Definition of Done** (voir §7) : tests automatisés verts + script de démo manuel validé. On ne revient pas en arrière : chaque brique est un point d'appui stable pour la suivante.

> **Conséquence concrète** : à _tout_ moment du projet, l'application se lance, se peuple de données de démo, et chaque fonctionnalité livrée est démontrable. On ne construit jamais "dans le noir".

---

## 2. Stack technique recommandée (et pourquoi)

| Couche                      | Choix recommandé                                                                             | Pourquoi                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Framework**               | **Next.js (App Router) + TypeScript**                                                        | Full-stack (UI + API dans un seul projet), rendu moderne, évolutif vers du réel   |
| **UI / design**             | **Tailwind CSS + shadcn/ui + lucide-react**                                                  | Beau, pro, cohérent, rapide à assembler ; base "classe" demandée                  |
| **Base de données**         | **Supabase (Postgres managé)**                                                               | Choix retenu. Postgres complet, migrations SQL versionnées, dashboard, prod-ready |
| **Accès données**           | **`supabase-js` + types TypeScript générés** (`supabase gen types`)                          | Requêtes typées, pas d'ORM lourd, aligné Supabase                                 |
| **Auth**                    | **Supabase Auth (magic link)**                                                               | Idéal pour le **portail client** (Brique 4), zéro gestion de mot de passe         |
| **Fichiers**                | **Supabase Storage**                                                                         | Photos boîte / QR (Brique 4), PDF documents & retours QC (Briques 3, 6)           |
| **Isolation multi-clients** | **Row Level Security (RLS) Postgres**                                                        | Un client ne voit **que** ses lots — garanti au niveau base (Brique 4)            |
| **Temps réel**              | **Supabase Realtime** (optionnel)                                                            | Mises à jour live tracking / alertes (Briques 1, 8)                               |
| **Validation**              | **Zod**                                                                                      | Schémas partagés front/back, sécurise les entrées (et les sorties IA)             |
| **Cartes**                  | **MapLibre / Leaflet**                                                                       | Position conteneurs (M7), open-source                                             |
| **Graphiques**              | **Recharts**                                                                                 | Courbes température/humidité datalogger                                           |
| **IA / LLM**                | **API LLM derrière un adaptateur**                                                           | Vérif documentaire (M6), analyse PDF QC (M9), copilot (T4)                        |
| **Tests unit/intégration**  | **Vitest** (contre **Supabase local**)                                                       | Rapide, natif TS ; base locale déterministe                                       |
| **Tests E2E**               | **Playwright**                                                                               | Valide les parcours de bout en bout (le "vérifier" de chaque brique)              |
| **Qualité**                 | **ESLint + Prettier + TypeScript strict**                                                    | Garde-fous permanents                                                             |
| **Exécution**               | **1 commande `dev`, 1 commande `db` (Supabase local), 1 commande `seed`, 1 commande `test`** | Vérification immédiate à chaque brique                                            |

> **Supabase local vs cloud** : pour le **dev et les tests**, on utilise **Supabase en local** via le CLI (`supabase start`, nécessite Docker) → base déterministe, aucune clé cloud requise, on préserve le principe « l'app tourne immédiatement ». Un **projet Supabase cloud** peut être branché plus tard en remplissant simplement le `.env` (URL + clés) — sans changer le code.
>
> **Ce qui reste "mock" malgré la base réelle** : Supabase est la **couche de données** (réelle dès le départ, en local). Les **sources externes** (MarineTraffic, FlightRadar, datalogger, email, LLM) restent, elles, derrière des **adaptateurs mock** (cf. §3.2). On ne confond pas les deux.

---

## 3. Fondations d'architecture (posées en Brique 0)

### 3.1 L'objet central : le LOT (shipment)

Tout le modèle de données gravite autour du **Lot**, créé au **Booking (M4)** et suivi jusqu'à la clôture (M10). Chaque entité devient une **table Postgres dans Supabase**, définie par des **migrations SQL versionnées** (`supabase/migrations/`), avec **RLS activée** dès la création (isolation client). Entités principales :

```
Client ──< Commande ──< Lot (shipment) >── Transporteur
                           │
     ┌─────────────────────┼───────────────────────────┐
  Documents            Événements (timeline)        MesuresCapteur
  (facture, BL,        (booking, chargement,        (temp, humidité,
   phyto, packing)      départ, transit, arrivée)    GPS / 10 min)
     │
  RapportQualité (QC départ + retour client, analysé IA)
  PreuveProduit (photo boîte, QR chargement)
  Origine (parcelle/récolte — M0b, multi-sites)
```

### 3.2 Le patron d'adaptateur (clé de la testabilité)

Chaque source externe est définie par une **interface** ; deux implémentations coexistent : `Mock` (par défaut, données KB) et `Real` (branché plus tard). Un simple flag choisit l'implémentation.

```typescript
// Illustration conceptuelle (pas le code final)
interface TrackingProvider {
  getPosition(ref: string): Promise<GeoPoint>;
  getSensorSeries(ref: string): Promise<SensorReading[]>;
}
// MockTrackingProvider  → rejoue une route Damietta→Trieste réaliste
// MarineTrafficProvider → API réelle (plus tard, sans toucher la brique)
```

Adaptateurs prévus : `TrackingProvider` (MarineTraffic/FlightRadar), `SensorProvider` (datalogger/API capteurs), `FieldTraceProvider` (Cropwise), `EmailProvider` (boîte mail), `LlmProvider` (vérif doc / analyse PDF / copilot).

### 3.3 Données de démo réalistes (seed)

Un jeu de données **calqué sur la base de connaissance** est chargé par un **`seed.sql` Supabase** (rejoué automatiquement par `supabase db reset`) : Barfoots (Tenderstem/PSB, RoRo Damietta→Trieste→UK), Georges Helfer (patate douce 40'RF→Marseille), Voltz (slips, avion CDG/AMS), Exo3 (ail Marseille), un cas Russie (ail Novorossiysk). Y compris **des cas "à problème"** (n° conteneur incohérent, lot maritime "fatigué" rejeté, phyto incomplet) pour tester la valeur IA. Les fichiers de démo (photos, PDF) sont poussés dans **Supabase Storage** au seed.

### 3.4 Feature flags

Chaque module est activable/désactivable. On livre des briques sans casser l'existant, et on démontre "l'app à l'instant T" proprement.

---

## 4. Séquence des briques (chaque brique = testable & démontrable)

> Ordre pensé pour que **chaque brique s'appuie sur la précédente** et soit **vérifiable seule**. P0 d'abord (demande explicite), puis la pépite IA (vérif documentaire).

### 🧱 Brique 0 — Fondations

- **But** : squelette qui tourne + socle de données + design system + adaptateurs mock + seed + CI.
- **Livrable** : l'app démarre, une page d'accueil "classe", `seed` peuple la base, `test` passe.
- **Modules** : M0 (référentiel), patrons d'adaptateurs, feature flags.
- **Vérification** : `dev` affiche la home ; `seed` crée les clients/lots de démo ; 1 test E2E "l'app charge".

### 🧱 Brique 1 — P0 : Suivi de voyage par n° de conteneur (M7)

- **But** : saisir un numéro → voir **tout le voyage** du lot.
- **Livrable** : page tracking = timeline d'événements + carte position + courbe température/humidité (datalogger mock) + score de risque d'arrivée.
- **Dépend de** : Brique 0.
- **Données de test** : lot Barfoots RoRo (Damietta→Trieste→UK) + lot patate douce (→Marseille) + lot "fatigué" (excursion température) dans le seed.
- **Vérification** :
  - E2E : saisir `CAAU4027760` → la timeline, la carte et la courbe s'affichent.
  - Cas limite : numéro inconnu → message clair.
  - Le lot "fatigué" affiche un **score de risque élevé**.

### 🧱 Brique 2 — Objet Lot : liste & fiche détaillée

- **But** : matérialiser l'objet central au-delà du tracking (liste filtrable + fiche 360°).
- **Livrable** : liste des lots (statut, client, produit, destination) + fiche lot regroupant tracking, docs, qualité, origine.
- **Dépend de** : Briques 0–1.
- **Vérification** : E2E navigation liste → fiche ; filtres de base fonctionnels.

### 🧱 Brique 3 — Documents & Conformité + Vérificateur IA + Gate (M6) ⭐ pépite

- **But** : déposer les documents, **vérifier la cohérence par IA**, et **verrouiller** l'expédition (Gate "Check OK").
- **Livrable** :
  - Dépôt de docs (facture, BL, phyto, packing list).
  - **Vérificateur IA** : cohérence croisée (n° conteneur, poids, HS code, quantités) → liste d'anomalies.
  - **Checklist conformité pays/produit** (Déclaration Additionnelle UE, règlement 2021/2285, couverture GGAP/GRASP).
  - **Gate** : bloquée tant que tout n'est pas vert ; au vert → **déclenche l'envoi mail** (mock d'abord).
- **Dépend de** : Briques 0–2 + `LlmProvider` (mock puis réel).
- **Données de test** : un jeu de docs **cohérent** (gate passe) et un jeu **incohérent** (n° conteneur divergent, HS erroné → gate bloque, anomalies listées).
- **Vérification** :
  - Test : docs cohérents → Gate = vert.
  - Test : n° conteneur incohérent → anomalie détectée, Gate = rouge.
  - E2E : passage au vert → événement "mail envoyé" (mock) tracé.

### 🧱 Brique 4 — Chargement & Preuve produit (M5) + Portail client lecture (T1)

- **But** : preuve de départ + première visibilité client.
- **Livrable** :
  - Scan **QR/photo au chargement** (upload horodaté).
  - **Photo boîte** par le manager → **visible côté client**.
  - **Portail client (lecture seule)** : le client voit ses lots, statuts, docs, photo boîte.
- **Dépend de** : Briques 0–3.
- **Vérification** : E2E : upload photo boîte → visible dans l'espace client ; le client ne voit **que** ses lots (test d'isolation des accès).

### 🧱 Brique 5 — Dashboard & KPIs (T3) + Planning prévu/réalisé (M3)

- **But** : pilotage interne.
- **Livrable** :
  - Dashboard **filtrable client / produit / pays / risque**.
  - KPIs **taux de service / taux de retard**.
  - **Planning semaine par semaine** + **import de l'Excel existant** + comparaison **prévu vs réalisé**.
- **Dépend de** : Briques 0–2 (données lots).
- **Données de test** : un fichier Excel d'exemple (format proche du leur).
- **Vérification** : import Excel → lignes créées ; KPI de retard calculé correctement sur un jeu connu ; filtres cohérents.

### 🧱 Brique 6 — Hub email & IA (T2) + Retour qualité analysé (M9)

- **But** : boucler la qualité et automatiser l'entrée des retours.
- **Livrable** :
  - **Import automatique du PDF de retour depuis les mails** (mock boîte mail d'abord).
  - **Analyse IA du PDF** : extraction défauts (Botrytis, floraison, radicelles…), scoring, rattachement au lot.
  - Vue "tendances qualité" par produit/client/site.
- **Dépend de** : Briques 0–4 + `LlmProvider` + `EmailProvider`.
- **Données de test** : les vrais PDF QC déjà présents (QCCheck_986640, 995769, QR patate douce, agréages fraise).
- **Vérification** : injecter QCCheck_986640 → défauts "floraison / tiges creuses" extraits, score ≈ 84, flag rouge.

### 🧱 Brique 7 — Demande & Onboarding + Certifications (M1, M2, M0c)

- **But** : automatiser l'entrée commerciale.
- **Livrable** :
  - **Onglet Demande** : réception → **matching automatique des certifs** (produit × pays).
  - Si suffisant → **envoi auto** pack + certifs. Sinon → **alerte + workflow de correction**.
  - **Coffre certifications** avec alertes d'expiration.
  - Création de l'espace client.
- **Dépend de** : Briques 0, 3 (email/gate), 4 (portail).
- **Vérification** : demande "mangue → UK" → **manque GGAP/GRASP mangue** détecté, alerte levée ; demande "brocoli → UK" → certifs OK, envoi auto (mock).

### 🧱 Brique 8 — Complétude du flux (M0b Cropwise, M10 Finance, T4 Copilot, T5 Alertes)

- **But** : fermer la boucle complète.
- **Livrable** :
  - **Connecteur Cropwise** (mock) + traçabilité multi-sites.
  - **Finance** : statut paiement + cohérence facture + litiges (cas Voltz).
  - **Copilot IA** (résumé mails, génération instruction sheets/réponses).
  - **Moteur d'alertes** (retard, excursion température, doc manquant).
- **Dépend de** : toutes les briques précédentes.
- **Vérification** : alerte générée sur excursion température ; copilot résume un fil de démo ; lot rattaché à une parcelle/site.

---

## 5. Passage du mock au réel (par intégration, sans réécriture)

Chaque adaptateur bascule **indépendamment**, quand la clé/API est disponible, **sans toucher aux briques** :

| Adaptateur           | Mock (dès le départ)            | Réel (quand prêt)             | Brique concernée |
| -------------------- | ------------------------------- | ----------------------------- | ---------------- |
| `TrackingProvider`   | Route rejouée                   | MarineTraffic / FlightRadar   | 1                |
| `SensorProvider`     | Séries simulées                 | Datalogger SIM / API capteurs | 1, 6             |
| `LlmProvider`        | Réponses simulées déterministes | API LLM                       | 3, 6, 8          |
| `EmailProvider`      | Boîte fictive                   | IMAP/API mail réelle          | 6, 7             |
| `FieldTraceProvider` | Données champ fictives          | Cropwise                      | 8                |

> **Test de non-régression** : chaque bascule mock→réel se valide par le **même jeu de tests** que le mock (mêmes contrats d'interface).

---

## 6. Stratégie de test (le "tester & vérifier" de chaque brique)

- **Tests unitaires (Vitest)** : logique métier pure (calcul score de risque, cohérence documentaire, calcul KPI retard). Rapides, nombreux.
- **Tests d'intégration** : logique + base sur **Supabase local** (`supabase start`, base réinitialisée par `supabase db reset`). Valide les flux de données **et les règles RLS** d'une brique.
- **Tests E2E (Playwright)** : **un parcours par brique** (ex : "saisir un n° → voir le voyage"). C'est le critère de démonstrabilité.
- **Seed déterministe** : `seed.sql` rejoué à chaque `db reset` → mêmes données de démo, tests reproductibles.
- **Script de démo manuel** : pour chaque brique, une **checklist de démo** (3–5 clics) à rejouer devant toi pour validation "métier".
- **CI** : `lint + typecheck + test` à chaque commit → la brique n'est jamais "cassée" en douce.

---

## 7. Definition of Done d'une brique (critère de passage)

Une brique n'est **terminée** que si **tout** est coché :

- [ ] Fonctionnalité utilisable de bout en bout (UI → Supabase).
- [ ] Adaptateurs externes en **mock réaliste** fonctionnels.
- [ ] Migration(s) SQL + **RLS** en place ; types TypeScript régénérés.
- [ ] **`seed.sql`** enrichi avec les cas de test (dont cas "à problème").
- [ ] Tests **unitaires + intégration (Supabase local)** verts.
- [ ] **1 test E2E** du parcours principal vert.
- [ ] **Checklist de démo manuelle** rejouée et validée.
- [ ] `lint`, `typecheck` OK.
- [ ] Feature flag en place (activable/désactivable).
- [ ] Aucune régression sur les briques précédentes.

---

## 8. Jalons & rythme

| Jalon                            | Contenu     | Ce qu'on peut montrer                                                    |
| -------------------------------- | ----------- | ------------------------------------------------------------------------ |
| **J1 — Socle vivant**            | Briques 0–1 | Une app "classe" qui suit un conteneur par son n° (P0)                   |
| **J2 — Le lot & la Gate**        | Briques 2–3 | Fiche lot 360° + vérif documentaire IA qui bloque les envois incohérents |
| **J3 — Preuve & visibilité**     | Briques 4–5 | Photo boîte côté client + dashboard KPIs + planning prévu/réalisé        |
| **J4 — Boucle qualité IA**       | Brique 6    | PDF de retour importé & analysé automatiquement                          |
| **J5 — Commercial & complétude** | Briques 7–8 | Demande/onboarding auto, Cropwise, finance, alertes, copilot             |

---

## 9. Ce que je recommande comme toute première action

Démarrer par **Brique 0 (Fondations, avec Supabase local)** puis **Brique 1 (P0 tracking)** dans la foulée, avec **données de démo réalistes (`seed.sql`)** et **adaptateurs externes mock** — pour avoir, dès le premier jalon, un outil **démontrable** qui suit un conteneur par son numéro. On valide ensemble la checklist de démo de la Brique 1, puis on enchaîne sur la **Gate + vérificateur IA (Brique 3)**, qui est la plus forte création de valeur.

### Points à confirmer avant de coder

1. **Stack** : Next.js + TS + Tailwind/shadcn + **Supabase** (validé) — OK ?
2. **Supabase** : dev/tests en **local via CLI** (Docker requis) — OK ? Sinon, fournir l'URL + les clés d'un projet cloud.
3. **Langue de l'UI** : interne FR / portail client EN / bilingue ?
4. **Datalogger** : matériel+SIM (A) vs API capteurs (B) — pour dimensionner `SensorProvider`.
5. **Périmètre Brique 1** : tracking seul, ou tracking + coquille de navigation (liste lots) ?

---

_Stratégie d'implémentation — pensée pour livrer, tester et valider brique par brique, du P0 (suivi conteneur) jusqu'au flux complet augmenté par l'IA. Chaque brique est une tranche verticale, mock-first, avec une Definition of Done stricte garantissant qu'on peut la vérifier et la compléter avant d'avancer._
