-- ============================================================================
-- Brique 3 ⭐ — M6 Documents & Conformité + Vérificateur IA + Gate « Check OK »
-- ============================================================================
-- Ajoute, autour des `documents` (Brique 0) :
--   • des métadonnées extraites par document (jsonb) pour la vérification croisée,
--   • les anomalies documentaires produites par le vérificateur IA,
--   • la checklist de conformité par pays/produit,
--   • un journal de la Gate (Check OK / mail envoyé),
--   • une vue de statut de Gate par lot (vert / rouge / en_attente).
-- RLS activée sur les nouvelles tables (deny par défaut) ; accès interne via
-- la service role. Isolation client (portail) ajoutée en Brique 4.
-- ============================================================================

-- ── Types énumérés ──────────────────────────────────────────────────────────
create type anomalie_severite as enum ('mineure', 'majeure', 'critique');
create type conformite_statut as enum ('ok', 'manquant', 'non_conforme', 'non_applicable');
create type gate_statut as enum ('en_attente', 'vert', 'rouge');
create type gate_evenement as enum ('check_ok', 'mail_envoye', 'override');

-- ── Documents : métadonnées extraites (IA) + suivi de mise à jour ────────────
alter table public.documents
  add column metadata   jsonb       not null default '{}'::jsonb,
  add column updated_at timestamptz not null default now();

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

comment on column public.documents.metadata is
  'Champs extraits du document (n° conteneur, poids, code HS, quantité, '
  'déclaration additionnelle…) — base de la vérification croisée IA.';

-- ── Anomalies documentaires (sorties du vérificateur IA) ─────────────────────
create table public.anomalies_documentaires (
  id         uuid primary key default gen_random_uuid(),
  lot_id     uuid not null references public.lots (id) on delete cascade,
  code       text not null,                    -- ex. 'conteneur_incoherent'
  champ      text,                             -- champ concerné (numero_conteneur…)
  severite   anomalie_severite not null,
  message    text not null,
  valeurs    jsonb not null default '{}'::jsonb, -- {attendu, trouve, sources[]}
  resolue    boolean not null default false,
  created_at timestamptz not null default now()
);
create index anomalies_lot_id_idx on public.anomalies_documentaires (lot_id);

-- ── Checklist de conformité (par pays / produit) ─────────────────────────────
create table public.conformite_checks (
  id         uuid primary key default gen_random_uuid(),
  lot_id     uuid not null references public.lots (id) on delete cascade,
  regle      text not null,                    -- ex. 'declaration_additionnelle_ue'
  libelle    text not null,
  statut     conformite_statut not null,
  message    text,
  created_at timestamptz not null default now()
);
create index conformite_lot_id_idx on public.conformite_checks (lot_id);
create unique index conformite_lot_regle_uidx
  on public.conformite_checks (lot_id, regle);

-- ── Journal de la Gate (Check OK / mail envoyé) — tracé « timeline » ─────────
create table public.gate_journal (
  id           uuid primary key default gen_random_uuid(),
  lot_id       uuid not null references public.lots (id) on delete cascade,
  evenement    gate_evenement not null,
  message      text,
  destinataire text,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index gate_journal_lot_id_idx on public.gate_journal (lot_id);

-- ── Vue : statut de Gate par lot ─────────────────────────────────────────────
-- « Check OK » = aucune anomalie bloquante (majeure/critique non résolue)
--   ET aucune règle de conformité en échec (manquant / non_conforme).
-- Tant qu'aucune vérification n'a tourné (aucun check enregistré) → en_attente.
create view public.lot_gate_status as
select
  l.id as lot_id,
  (
    select count(*) from public.anomalies_documentaires a
    where a.lot_id = l.id and a.severite in ('majeure', 'critique') and not a.resolue
  ) as anomalies_bloquantes,
  (select count(*) from public.anomalies_documentaires a where a.lot_id = l.id) as anomalies_total,
  (
    select count(*) from public.conformite_checks c
    where c.lot_id = l.id and c.statut in ('manquant', 'non_conforme')
  ) as conformite_ko,
  (select count(*) from public.conformite_checks c where c.lot_id = l.id) as conformite_total,
  exists (
    select 1 from public.gate_journal g
    where g.lot_id = l.id and g.evenement = 'mail_envoye'
  ) as mail_envoye,
  case
    when (select count(*) from public.conformite_checks c where c.lot_id = l.id) = 0
      then 'en_attente'
    when (
      select count(*) from public.anomalies_documentaires a
      where a.lot_id = l.id and a.severite in ('majeure', 'critique') and not a.resolue
    ) > 0 then 'rouge'
    when (
      select count(*) from public.conformite_checks c
      where c.lot_id = l.id and c.statut in ('manquant', 'non_conforme')
    ) > 0 then 'rouge'
    else 'vert'
  end::gate_statut as statut
from public.lots l;

comment on view public.lot_gate_status is
  'Statut de la Gate « Check OK » par lot (Brique 3) : vert / rouge / en_attente.';

-- ============================================================================
-- RLS — activée partout (deny par défaut). La service role contourne la RLS.
-- ============================================================================
alter table public.anomalies_documentaires enable row level security;
alter table public.conformite_checks       enable row level security;
alter table public.gate_journal            enable row level security;

-- ── Privilèges (convention Brique 0 : sécurité par RLS, pas par GRANT) ───────
grant select, insert, update, delete
  on public.anomalies_documentaires, public.conformite_checks, public.gate_journal
  to anon, authenticated, service_role;

grant select on public.lot_gate_status to anon, authenticated, service_role;
