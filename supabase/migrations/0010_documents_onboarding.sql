-- ============================================================================
-- Brique 7bis — Documents d'onboarding (client-scopés) + boîte d'envoi (démo)
-- ============================================================================
-- Complète M2 (onboarding) : à la création de l'espace client, la plateforme
-- génère des documents de bienvenue/certifs/produit LISIBLES par le client dans
-- son portail (RLS, même modèle que la Brique 4), et journalise les emails mock
-- (pack de présentation + onboarding) pour les rendre visibles côté interne.
--
--   • documents_onboarding : client-scopé, SELECT autorisé au client (portail) ;
--   • emails_envoyes       : INTERNE (deny RLS ; lu via service role sur /demande).
-- ============================================================================

-- ── Types énumérés ──────────────────────────────────────────────────────────
create type document_onboarding_type as enum ('bienvenue', 'certifs', 'produit');
create type email_categorie as enum ('pack_certif', 'onboarding');

-- ── Documents d'onboarding (lisibles par le client) ──────────────────────────
create table public.documents_onboarding (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  demande_id   uuid references public.demandes (id) on delete set null,
  type         document_onboarding_type not null,
  titre        text not null,
  contenu_html text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index documents_onboarding_client_id_idx on public.documents_onboarding (client_id);
-- Idempotence de l'onboarding : un document par (demande, type). Les lignes de
-- seed (demande_id NULL) restent distinctes (NULLs non contraints par un unique).
create unique index documents_onboarding_demande_type_uidx
  on public.documents_onboarding (demande_id, type);

comment on table public.documents_onboarding is
  'Documents d''onboarding (M2) générés à la création de l''espace client, '
  'lisibles par le client dans son portail (RLS, Brique 4).';

-- ── Journal des emails envoyés (démo — mock EmailProvider) ───────────────────
create table public.emails_envoyes (
  id         uuid primary key default gen_random_uuid(),
  categorie  email_categorie not null,
  to_email   text not null,
  subject    text not null,
  body       text not null,
  demande_id uuid references public.demandes (id) on delete set null,
  client_id  uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now()
);
create index emails_envoyes_created_at_idx on public.emails_envoyes (created_at desc);

comment on table public.emails_envoyes is
  'Journal (démo) des emails envoyés par la plateforme via le mock EmailProvider '
  '(pack de présentation + onboarding). Interne — non exposé au portail.';

-- ── Trigger updated_at (fonction définie en Brique 0) ────────────────────────
create trigger documents_onboarding_set_updated_at
  before update on public.documents_onboarding
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS — activée partout (deny par défaut). La service role contourne la RLS.
-- ============================================================================
alter table public.documents_onboarding enable row level security;
alter table public.emails_envoyes        enable row level security;

-- Le client LIT ses propres documents d'onboarding (même patron que Brique 4).
create policy documents_onboarding_select_portail
  on public.documents_onboarding for select to authenticated
  using (client_id in (select public.current_client_ids()));

-- emails_envoyes : AUCUNE policy → deny total pour anon/authenticated (interne).

-- ── Privilèges (convention Brique 0 : sécurité par RLS, pas par GRANT) ───────
grant select, insert, update, delete
  on public.documents_onboarding, public.emails_envoyes
  to anon, authenticated, service_role;
