-- ============================================================================
-- Brique 7 — M1 Demande & Qualification + M2 Onboarding + M0c Coffre certifs
-- ============================================================================
-- Automatise l'entrée commerciale (RAIL CLIENT) :
--   • M0c `certifications` : coffre des certifs NK (GGAP, GRASP, BRCGS, SMETA,
--     Sedex) avec couverture produit/pays et dates de validité (alerte expiration) ;
--   • M1 `demandes` : réception d'une demande (produit × pays × client), matching
--     automatique des certifs → décision suffisant / insuffisant + raison (tracée) ;
--   • `taches_correction` : workflow d'obtention/correction quand une certif manque ;
--   • M2 onboarding : la création de l'espace client réutilise Supabase Auth +
--     `client_users` (Brique 4) — d'où le flag `espace_client_cree` sur la demande.
--
-- Tables INTERNES (rail commercial) : RLS activée, deny par défaut. Accès via la
-- service role (comme les autres briques internes). Aucune policy portail : le
-- client final n'a pas à voir le workflow de qualification.
-- ============================================================================

-- ── Types énumérés ──────────────────────────────────────────────────────────
create type certif_type as enum ('ggap', 'grasp', 'brcgs', 'smeta', 'sedex');
create type certif_statut as enum ('valide', 'suspendue', 'expiree');
create type demande_statut as enum ('recue', 'envoyee', 'en_correction', 'cloturee');
create type demande_decision as enum ('en_attente', 'suffisant', 'insuffisant');
create type tache_statut as enum ('a_faire', 'en_cours', 'fait');

-- ── M0c — Coffre à certifications ─────────────────────────────────────────────
-- `produits` / `pays` : jetons de couverture (familles produit normalisées ;
-- codes pays ou 'ALL'). Le matching (M1) s'appuie STRICTEMENT sur ces colonnes —
-- pas d'invention de certif.
create table public.certifications (
  id              uuid primary key default gen_random_uuid(),
  type            certif_type not null,
  organisme       text,
  numero          text,
  produits        text[] not null default '{}',
  pays            text[] not null default '{}',
  date_obtention  date,
  date_expiration date,
  statut          certif_statut not null default 'valide',
  storage_path    text, -- pièce dans le bucket 'documents' (pack / attestation)
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Une ligne de coffre par type de certification (facilite le top-up idempotent).
create unique index certifications_type_uidx on public.certifications (type);

comment on table public.certifications is
  'M0c — Coffre des certifications Natural Kiss (couverture produit/pays, validité). '
  'Base du matching automatique de la Brique 7.';

-- ── M1 — Demandes commerciales ────────────────────────────────────────────────
create table public.demandes (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid references public.clients (id) on delete set null,
  client_nom         text not null,
  contact_email      text,
  produit            text not null,
  pays               text not null,
  volume             text,
  statut             demande_statut not null default 'recue',
  decision           demande_decision not null default 'en_attente',
  raison             text,
  certifs_requises   text[] not null default '{}',
  certifs_manquantes text[] not null default '{}',
  pack_envoye_at     timestamptz,
  espace_client_cree boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index demandes_client_id_idx on public.demandes (client_id);
create index demandes_statut_idx on public.demandes (statut);

comment on table public.demandes is
  'M1 — Demandes (produit × pays × client). Décision suffisant/insuffisant + '
  'raison tracées après matching des certifs (M0c).';

-- ── Workflow de correction (obtention d'une certif manquante) ─────────────────
create table public.taches_correction (
  id          uuid primary key default gen_random_uuid(),
  demande_id  uuid not null references public.demandes (id) on delete cascade,
  certif_type certif_type not null,
  produit     text not null,
  pays        text not null,
  libelle     text not null,
  statut      tache_statut not null default 'a_faire',
  assignee    text,
  echeance    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index taches_demande_id_idx on public.taches_correction (demande_id);

comment on table public.taches_correction is
  'Workflow d''obtention/correction des certifications manquantes (Brique 7).';

-- ── Triggers updated_at ──────────────────────────────────────────────────────
create trigger certifications_set_updated_at before update on public.certifications for each row execute function public.set_updated_at();
create trigger demandes_set_updated_at       before update on public.demandes       for each row execute function public.set_updated_at();
create trigger taches_set_updated_at         before update on public.taches_correction for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS — activée partout (deny par défaut). La service role contourne la RLS.
-- ============================================================================
alter table public.certifications     enable row level security;
alter table public.demandes           enable row level security;
alter table public.taches_correction  enable row level security;

-- ── Privilèges (convention Brique 0 : sécurité par RLS, pas par GRANT) ───────
grant select, insert, update, delete
  on public.certifications, public.demandes, public.taches_correction
  to anon, authenticated, service_role;
