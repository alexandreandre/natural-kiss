-- ============================================================================
-- Brique 9 — M4 Booking : dossier de réservation + point d'entrée unique de
-- confirmation (création du lot)
-- ============================================================================
-- Constat de cadrage : le CANAL de réservation varie énormément (transporteur
-- direct, broker, transitaire, téléphone, portail transporteur…) — l'outil ne
-- doit pas parier sur un canal unique. On sépare donc :
--
--   1) La DEMANDE (sortante, variable) : `demandes_booking` porte les infos
--      stables (produit, quantité, incoterm, destination, date souhaitée) et
--      un `dossier_texte` généré en un clic, copiable vers n'importe quel canal.
--   2) La CONFIRMATION (entrante) : un seul geste — « confirmer un booking »
--      avec 3 champs (n° conteneur, transporteur, date de départ) — fait
--      naître le LOT, que la confirmation soit saisie à la main ou pré-remplie
--      par lecture IA d'un mail de confirmation (adaptateur mock → LLM réel).
--
-- Modèle de sécurité : cohérent avec les briques précédentes — table interne,
-- RLS activée (deny par défaut), accès via la service role.
-- ============================================================================

create type booking_statut as enum ('brouillon', 'envoye', 'confirme');

create table public.demandes_booking (
  id                uuid primary key default gen_random_uuid(),
  -- Rattachements optionnels : une demande peut naître d'une commande (M3) et/ou
  -- d'une ligne de planning (M3, Brique 5), ou être créée directement (ad hoc).
  commande_id       uuid references public.commandes (id) on delete set null,
  planning_id       uuid references public.planning (id) on delete set null,
  client_id         uuid not null references public.clients (id) on delete cascade,
  produit           text not null,
  variete           text,
  quantite          numeric,
  unite             text,
  incoterm          text,
  destination_pays  text,
  destination_port  text,
  mode              transport_mode not null,
  date_souhaitee    date,
  -- Dossier de réservation généré (texte standardisé, copiable vers n'importe
  -- quel canal — email, portail transporteur, note d'appel téléphonique).
  dossier_texte     text not null,
  statut            booking_statut not null default 'brouillon',
  -- Canal utilisé pour la demande, libre (email / portail / telephone / autre) —
  -- jamais imposé : c'est une note, pas une contrainte de workflow.
  canal             text,
  envoyee_le        timestamptz,
  -- Renseigné à la confirmation : le lot créé par ce booking.
  lot_id            uuid references public.lots (id) on delete set null,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index demandes_booking_client_id_idx on public.demandes_booking (client_id);
create index demandes_booking_statut_idx on public.demandes_booking (statut);
create index demandes_booking_lot_id_idx on public.demandes_booking (lot_id);

comment on table public.demandes_booking is
  'M4 — Dossier de réservation (Brique 9). Sépare la demande sortante (canal '
  'variable, non contraint) de la confirmation entrante qui crée le LOT.';

comment on column public.demandes_booking.dossier_texte is
  'Brief standardisé généré depuis les champs stables (produit, quantité, '
  'incoterm, destination, date) — copiable vers n''importe quel canal.';

comment on column public.demandes_booking.canal is
  'Canal utilisé (email/portail/telephone/autre) — libre, jamais imposé.';

create trigger demandes_booking_set_updated_at
  before update on public.demandes_booking
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.demandes_booking enable row level security;

-- Table interne (pilotage Natural Kiss) : aucune policy authenticated/anon —
-- accès uniquement via la service role, comme M10/T4/T5 (Brique 8).
grant select, insert, update, delete on public.demandes_booking
  to anon, authenticated, service_role;
