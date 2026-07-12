-- ============================================================================
-- Brique 5 — M3 Commande & Planning (prévu vs réalisé) + socle du dashboard T3
-- ============================================================================
-- Ajoute la table `planning` : le planning de départ « semaine par semaine »
-- (issu de l'import de l'Excel existant) que l'on rapproche du RÉALISÉ (les lots
-- effectivement partis). Chaque ligne = un départ PRÉVU pour une semaine donnée,
-- éventuellement relié à un lot réalisé (`lot_id`).
--
-- Modèle de sécurité (cohérent avec les briques précédentes) :
--   • service_role (pilotage interne, import) : contourne la RLS ;
--   • authenticated (portail) : ne LIT que le planning de SES clients ;
--   • anon : deny (aucune policy).
-- ============================================================================

create table public.planning (
  id                uuid primary key default gen_random_uuid(),
  -- Semaine ISO (« 2026-W12 ») + lundi de la semaine (tri / regroupement).
  semaine_iso       text not null,
  semaine_debut     date not null,
  -- Client : rattaché au référentiel quand on retrouve le nom, sinon libellé brut
  -- conservé (`client_nom`) pour ne pas perdre l'info de l'Excil importé.
  client_id         uuid references public.clients (id) on delete set null,
  client_nom        text,
  produit           text not null,
  variete           text,
  destination_pays  text,
  destination_port  text,
  quantite_prevue   numeric,
  unite             text,
  -- Réalisé : lot effectivement parti rattaché à cette ligne de planning.
  lot_id            uuid references public.lots (id) on delete set null,
  -- Provenance de la ligne : 'import' (Excel), 'seed' (démo) ou 'manuel'.
  source            text not null default 'import',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index planning_semaine_debut_idx on public.planning (semaine_debut);
create index planning_client_id_idx on public.planning (client_id);
create index planning_lot_id_idx on public.planning (lot_id);
create index planning_source_idx on public.planning (source);

comment on table public.planning is
  'Planning de départ semaine par semaine (M3, Brique 5). Chaque ligne = un '
  'départ prévu, rapproché du réalisé via lot_id. Alimenté par import Excel.';

create trigger planning_set_updated_at
  before update on public.planning
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.planning enable row level security;

-- Le client (portail, lecture seule) voit UNIQUEMENT le planning de ses clients.
-- (Le pilotage interne passe par la service role, qui contourne la RLS.)
create policy planning_select_portail
  on public.planning for select to authenticated
  using (client_id in (select public.current_client_ids()));

-- ── Privilèges (les nouvelles tables ne sont pas couvertes par le GRANT global
-- « on all tables » de la migration 0001 — il faut les accorder explicitement).
-- La sécurité reste portée par la RLS (deny par défaut).
grant select, insert, update, delete on public.planning
  to anon, authenticated, service_role;
