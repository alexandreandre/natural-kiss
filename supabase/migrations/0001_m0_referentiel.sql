-- ============================================================================
-- Brique 0 — M0 Référentiel / socle de données autour de l'objet LOT (shipment)
-- ============================================================================
-- Toutes les tables ont RLS ACTIVÉE dès la création.
-- Accès interne : via la service role key (contourne RLS par design Supabase).
-- Isolation client (portail, Brique 4) : préparée ici (colonnes + helper),
-- les policies client seront ajoutées dans la migration de la Brique 4.
-- ============================================================================

-- ── Types énumérés ──────────────────────────────────────────────────────────
create type transport_mode as enum ('sea', 'roro', 'air', 'road');
create type lot_statut as enum (
  'booking', 'chargement', 'transit', 'arrive', 'livre', 'cloture', 'rejete'
);
create type document_type as enum (
  'facture', 'bl', 'phyto', 'packing_list', 'certificat_origine', 'ched_pp', 'autre'
);
create type evenement_code as enum (
  'booking', 'loading', 'departure', 'transit', 'port_call', 'arrival', 'customs', 'delivery'
);
create type document_statut as enum ('recu', 'verifie', 'anomalie');
create type qc_source as enum ('qc_depart', 'retour_client');
create type qc_verdict as enum ('vert', 'orange', 'rouge');
create type preuve_type as enum ('photo_boite', 'qr_chargement', 'autre');

-- ── Fonction utilitaire : maintien de updated_at ────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- Tables
-- ============================================================================

-- Clients ---------------------------------------------------------------------
create table public.clients (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null,
  pays          text,
  ville         text,
  contact_nom   text,
  contact_email text,
  -- Lien vers l'utilisateur Auth du portail (isolation client, Brique 4).
  portail_user_id uuid references auth.users (id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Transporteurs ---------------------------------------------------------------
create table public.transporteurs (
  id         uuid primary key default gen_random_uuid(),
  nom        text not null,
  mode       transport_mode,
  contact    text,
  created_at timestamptz not null default now()
);

-- Commandes -------------------------------------------------------------------
create table public.commandes (
  id                uuid primary key default gen_random_uuid(),
  reference         text unique not null,
  client_id         uuid not null references public.clients (id) on delete cascade,
  produit           text not null,
  variete           text,
  quantite          numeric,
  unite             text,
  incoterm          text,
  prix_unitaire     numeric,
  devise            text not null default 'EUR',
  pays_destination  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Lots (shipment) — objet central --------------------------------------------
create table public.lots (
  id                    uuid primary key default gen_random_uuid(),
  reference             text unique not null,
  numero_conteneur      text,
  commande_id           uuid references public.commandes (id) on delete set null,
  client_id             uuid not null references public.clients (id) on delete cascade,
  transporteur_id       uuid references public.transporteurs (id) on delete set null,
  produit               text not null,
  variete               text,
  mode                  transport_mode not null,
  statut                lot_statut not null default 'booking',
  origine_port          text,
  destination_port      text,
  destination_pays      text,
  temperature_consigne_c numeric,
  date_booking          date,
  date_depart           timestamptz,
  date_arrivee_prevue   timestamptz,
  date_arrivee_reelle   timestamptz,
  score_risque          integer check (score_risque between 0 and 100),
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index lots_client_id_idx on public.lots (client_id);
create index lots_numero_conteneur_idx on public.lots (numero_conteneur);
create index lots_statut_idx on public.lots (statut);

-- Origines (M0b — traçabilité champ) ------------------------------------------
create table public.origines (
  id           uuid primary key default gen_random_uuid(),
  lot_id       uuid not null references public.lots (id) on delete cascade,
  site         text not null,
  parcelle     text,
  variete      text,
  date_recolte date,
  traitements  text[] not null default '{}',
  created_at   timestamptz not null default now()
);
create index origines_lot_id_idx on public.origines (lot_id);

-- Documents -------------------------------------------------------------------
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  lot_id       uuid not null references public.lots (id) on delete cascade,
  type         document_type not null,
  nom_fichier  text not null,
  storage_path text, -- objet dans le bucket 'documents'
  statut       document_statut not null default 'recu',
  created_at   timestamptz not null default now()
);
create index documents_lot_id_idx on public.documents (lot_id);

-- Événements timeline ---------------------------------------------------------
create table public.evenements_timeline (
  id         uuid primary key default gen_random_uuid(),
  lot_id     uuid not null references public.lots (id) on delete cascade,
  code       evenement_code not null,
  label      text not null,
  lieu       text,
  mode       transport_mode,
  at         timestamptz not null,
  created_at timestamptz not null default now()
);
create index evenements_lot_id_at_idx on public.evenements_timeline (lot_id, at);

-- Mesures capteur (datalogger ~10 min) ----------------------------------------
create table public.mesures_capteur (
  id            uuid primary key default gen_random_uuid(),
  lot_id        uuid not null references public.lots (id) on delete cascade,
  at            timestamptz not null,
  temp_c        numeric,
  humidite_pct  numeric,
  lat           numeric,
  lng           numeric,
  created_at    timestamptz not null default now()
);
create index mesures_lot_id_at_idx on public.mesures_capteur (lot_id, at);

-- Rapports qualité (QC départ + retour client) --------------------------------
create table public.rapports_qualite (
  id           uuid primary key default gen_random_uuid(),
  lot_id       uuid not null references public.lots (id) on delete cascade,
  source       qc_source not null,
  verdict      qc_verdict not null,
  score        numeric,
  defauts      text[] not null default '{}',
  recu_le      date,
  storage_path text, -- objet dans le bucket 'retours-qc'
  created_at   timestamptz not null default now()
);
create index rapports_lot_id_idx on public.rapports_qualite (lot_id);

-- Preuves produit (photo boîte / QR chargement) -------------------------------
create table public.preuves_produit (
  id             uuid primary key default gen_random_uuid(),
  lot_id         uuid not null references public.lots (id) on delete cascade,
  type           preuve_type not null,
  storage_path   text, -- objet dans le bucket 'preuves'
  prise_le       timestamptz,
  visible_client boolean not null default false,
  created_at     timestamptz not null default now()
);
create index preuves_lot_id_idx on public.preuves_produit (lot_id);

-- ── Triggers updated_at ──────────────────────────────────────────────────────
create trigger clients_set_updated_at   before update on public.clients   for each row execute function public.set_updated_at();
create trigger commandes_set_updated_at before update on public.commandes for each row execute function public.set_updated_at();
create trigger lots_set_updated_at      before update on public.lots      for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS — activée partout, deny par défaut. La service role contourne la RLS.
-- ============================================================================
alter table public.clients            enable row level security;
alter table public.transporteurs      enable row level security;
alter table public.commandes          enable row level security;
alter table public.lots               enable row level security;
alter table public.origines           enable row level security;
alter table public.documents          enable row level security;
alter table public.evenements_timeline enable row level security;
alter table public.mesures_capteur    enable row level security;
alter table public.rapports_qualite   enable row level security;
alter table public.preuves_produit    enable row level security;

-- ── Terrain pour l'isolation client (Brique 4) ───────────────────────────────
-- Renvoie le client rattaché à l'utilisateur Auth courant (portail).
-- Les policies client (SELECT sur ses propres lots/documents/preuves) seront
-- ajoutées en Brique 4 en s'appuyant sur cette fonction.
create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id from public.clients c where c.portail_user_id = auth.uid() limit 1;
$$;

comment on function public.current_client_id() is
  'Isolation portail client (Brique 4) : client rattaché à auth.uid().';

-- ── Privilèges (convention Supabase) ─────────────────────────────────────────
-- La sécurité repose sur la RLS (deny par défaut), pas sur les GRANT :
--   • service_role : contourne la RLS (accès interne complet) ;
--   • anon / authenticated : DML accordé, mais borné par les policies (aucune
--     policy permissive en Brique 0 → aucun accès tant que Brique 4 n'en ajoute).
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;
