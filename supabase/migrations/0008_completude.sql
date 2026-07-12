-- ============================================================================
-- Brique 8 — Complétude du flux (M0b Cropwise, M10 Finance, T4 Copilot, T5 Alertes)
-- ============================================================================
-- Tables INTERNES : RLS activée, deny par défaut (accès via la service role,
-- comme le reste des briques internes — cf. convention Brique 0).
-- ============================================================================

-- ── M0b — Connecteur Cropwise : `origines` gagne une référence traçable ──────
-- `ref` = référence utilisée côté FieldTraceProvider (n° conteneur / réf. lot).
-- Permet un upsert idempotent par (lot, ref) quand le connecteur est rejoué,
-- sans empêcher les saisies manuelles historiques (ref nulle).
-- Index non partiel : requis pour qu'`ON CONFLICT (lot_id, ref)` (upsert du
-- connecteur) cible cet index. Les NULL restent non conflictuels entre eux
-- (sémantique standard SQL) : les saisies manuelles historiques ne sont pas
-- contraintes.
alter table public.origines add column ref text;
create unique index origines_lot_ref_uidx on public.origines (lot_id, ref);

comment on column public.origines.ref is
  'Référence Cropwise (FieldTraceProvider) ayant produit cette ligne — null pour une saisie manuelle.';

-- ── Types énumérés ──────────────────────────────────────────────────────────
create type paiement_statut as enum ('a_venir', 'en_attente', 'partiel', 'paye', 'litige');
create type litige_type as enum ('facture_contestee', 'sous_evaluation_douaniere', 'qualite', 'autre');
create type litige_statut as enum ('ouvert', 'en_cours', 'resolu', 'clos');
create type alerte_type as enum ('retard_navire', 'excursion_temperature', 'document_manquant', 'risque_quarantaine');
create type alerte_severite as enum ('info', 'avertissement', 'critique');
create type alerte_statut as enum ('active', 'resolue', 'ignoree');

-- ── M10 — Finance légère ──────────────────────────────────────────────────────

-- Statut de paiement : une ligne par lot (suivi, pas de facturation réelle).
create table public.paiements (
  id         uuid primary key default gen_random_uuid(),
  lot_id     uuid not null unique references public.lots (id) on delete cascade,
  statut     paiement_statut not null default 'a_venir',
  montant    numeric,
  devise     text not null default 'EUR',
  echeance   date,
  paye_le    date,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.paiements is
  'M10 — Statut de paiement par lot (suivi léger, pas un moteur comptable).';

-- Litiges (cas type Voltz : facture contestée, documents retenus).
create table public.litiges (
  id                uuid primary key default gen_random_uuid(),
  lot_id            uuid not null references public.lots (id) on delete cascade,
  type              litige_type not null,
  statut            litige_statut not null default 'ouvert',
  montant_conteste  numeric,
  devise            text not null default 'EUR',
  description       text not null,
  resolution        text,
  ouvert_le         date not null default current_date,
  resolu_le         date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index litiges_lot_id_idx on public.litiges (lot_id);
create index litiges_statut_idx on public.litiges (statut);

comment on table public.litiges is
  'M10 — Litiges financiers (facture contestée type Voltz, sous-évaluation douanière…).';

-- Certificats de destruction (lot rejeté / détruit à l'arrivée).
create table public.certificats_destruction (
  id           uuid primary key default gen_random_uuid(),
  lot_id       uuid not null references public.lots (id) on delete cascade,
  motif        text not null,
  quantite     numeric,
  unite        text,
  storage_path text,
  emis_le      date not null default current_date,
  created_at   timestamptz not null default now()
);
create index certificats_destruction_lot_id_idx on public.certificats_destruction (lot_id);

comment on table public.certificats_destruction is
  'M10 — Certificat de destruction émis pour un lot rejeté / détruit à l''arrivée.';

-- ── T5 — Alertes proactives ───────────────────────────────────────────────────
-- Une ligne par (lot, type) : le moteur d'alertes recalcule l'état à chaque
-- passage (upsert), plutôt que d'accumuler un historique — cohérent avec le
-- modèle "replace on rerun" déjà utilisé par la Gate (Brique 3).
create table public.alertes (
  id              uuid primary key default gen_random_uuid(),
  lot_id          uuid not null references public.lots (id) on delete cascade,
  type            alerte_type not null,
  severite        alerte_severite not null default 'avertissement',
  statut          alerte_statut not null default 'active',
  message         text not null,
  valeur_mesuree  numeric,
  detectee_le     timestamptz not null default now(),
  resolue_le      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index alertes_lot_type_uidx on public.alertes (lot_id, type);
create index alertes_statut_idx on public.alertes (statut);

comment on table public.alertes is
  'T5 — Moteur d''alertes proactives (retard navire, excursion température, '
  'document manquant, risque de quarantaine) — alimenté par TrackingProvider / '
  'SensorProvider / Gate (M6).';

-- ── Triggers updated_at ──────────────────────────────────────────────────────
create trigger paiements_set_updated_at before update on public.paiements for each row execute function public.set_updated_at();
create trigger litiges_set_updated_at   before update on public.litiges   for each row execute function public.set_updated_at();
create trigger alertes_set_updated_at   before update on public.alertes   for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS — activée partout (deny par défaut). La service role contourne la RLS.
-- ============================================================================
alter table public.paiements               enable row level security;
alter table public.litiges                 enable row level security;
alter table public.certificats_destruction enable row level security;
alter table public.alertes                 enable row level security;

grant select, insert, update, delete
  on public.paiements, public.litiges, public.certificats_destruction, public.alertes
  to anon, authenticated, service_role;

-- ── Realtime (optionnel, §Base de données) : pousser les alertes en live ────
alter publication supabase_realtime add table public.alertes;
