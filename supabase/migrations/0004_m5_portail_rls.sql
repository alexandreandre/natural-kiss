-- ============================================================================
-- Brique 4 — M5 Preuve produit (chargement) + T1 Portail client (lecture)
-- ============================================================================
-- Cette migration ouvre l'isolation client AU NIVEAU BASE (pas seulement UI) :
--   • table de liaison `client_users` (un client ↔ un ou plusieurs auth.users) ;
--   • fonctions d'aide (SECURITY DEFINER) pour résoudre les clients de l'user ;
--   • policies RLS SELECT pour le rôle `authenticated` (portail lecture seule) ;
--   • policies Storage sur le bucket `preuves` (accès client à ses fichiers) ;
--   • vue `lot_gate_status` passée en `security_invoker` (ne fuit plus les lots).
--
-- Modèle de sécurité :
--   • service_role (accès interne) : contourne la RLS → inchangé ;
--   • authenticated (portail) : ne LIT que les lots/documents/preuves de SON
--     client ; aucun droit d'écriture (aucune policy INSERT/UPDATE/DELETE) ;
--   • anon : toujours deny (aucune policy).
-- ============================================================================

-- ── Table de liaison client ↔ utilisateurs Auth ─────────────────────────────
-- Retenue par le prompt Brique 4 : un client peut avoir plusieurs utilisateurs
-- portail, et (le cas échéant) un utilisateur peut être rattaché à plusieurs
-- clients. La colonne historique `clients.portail_user_id` reste tolérée en
-- repli par `current_client_id()`.
create table public.client_users (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);
create index client_users_user_id_idx on public.client_users (user_id);
create index client_users_client_id_idx on public.client_users (client_id);

comment on table public.client_users is
  'Liaison portail (Brique 4) : rattache des utilisateurs Auth à un client. '
  'Base de l''isolation RLS — un utilisateur ne lit que les lots de ses clients.';

alter table public.client_users enable row level security;

-- ============================================================================
-- Fonctions d'aide (SECURITY DEFINER → contournent la RLS pour éviter toute
-- récursion de policy et rester performantes).
-- ============================================================================

-- Ensemble des clients rattachés à l'utilisateur Auth courant.
create or replace function public.current_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cu.client_id from public.client_users cu where cu.user_id = auth.uid();
$$;

comment on function public.current_client_ids() is
  'Clients rattachés à auth.uid() via client_users (isolation portail, Brique 4).';

-- Client « principal » de l'utilisateur (repli sur clients.portail_user_id).
create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select cu.client_id from public.client_users cu
       where cu.user_id = auth.uid() limit 1),
    (select c.id from public.clients c
       where c.portail_user_id = auth.uid() limit 1)
  );
$$;

-- Le lot appartient-il à un client de l'utilisateur courant ?
create or replace function public.lot_belongs_to_current_user(p_lot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lots l
    join public.client_users cu on cu.client_id = l.client_id
    where l.id = p_lot_id and cu.user_id = auth.uid()
  );
$$;

comment on function public.lot_belongs_to_current_user(uuid) is
  'Vrai si le lot appartient à un client rattaché à auth.uid() (policies portail).';

-- ============================================================================
-- Policies RLS — SELECT pour `authenticated` (portail, lecture seule).
-- ============================================================================

-- Un utilisateur voit ses propres lignes de liaison.
create policy client_users_select_self
  on public.client_users for select to authenticated
  using (user_id = auth.uid());

-- Le client voit sa propre fiche client (nom, coordonnées).
create policy clients_select_portail
  on public.clients for select to authenticated
  using (id in (select public.current_client_ids()));

-- Le client voit UNIQUEMENT ses lots.
create policy lots_select_portail
  on public.lots for select to authenticated
  using (client_id in (select public.current_client_ids()));

-- Documents du dossier, rattachés à ses lots.
create policy documents_select_portail
  on public.documents for select to authenticated
  using (public.lot_belongs_to_current_user(lot_id));

-- Frise d'événements (dont le chargement) de ses lots.
create policy evenements_select_portail
  on public.evenements_timeline for select to authenticated
  using (public.lot_belongs_to_current_user(lot_id));

-- Rapports qualité de ses lots (retours QC).
create policy rapports_select_portail
  on public.rapports_qualite for select to authenticated
  using (public.lot_belongs_to_current_user(lot_id));

-- Preuves produit de ses lots — SEULEMENT celles marquées visibles client
-- (la photo boîte l'est ; le QR de chargement reste interne par défaut).
create policy preuves_select_portail
  on public.preuves_produit for select to authenticated
  using (public.lot_belongs_to_current_user(lot_id) and visible_client = true);

-- ── Privilèges de la table de liaison (convention : sécurité par RLS) ────────
grant select, insert, update, delete on public.client_users
  to anon, authenticated, service_role;

-- ============================================================================
-- Vue Gate : `security_invoker` → respecte la RLS de l'appelant.
-- Sans cela, un client `authenticated` pourrait lister les `lot_id` de TOUS les
-- lots via la vue (fuite d'existence). En invoker, la vue ne renvoie que les
-- lots visibles par l'appelant ; la service role (interne) voit toujours tout.
-- ============================================================================
alter view public.lot_gate_status set (security_invoker = on);

-- ============================================================================
-- Storage — bucket `preuves` : le client `authenticated` peut LIRE (créer une
-- URL signée) uniquement les objets rattachés à une preuve visible de SES lots.
-- Les uploads/écritures restent le fait de la service role (interne).
-- `storage_path` peut être stocké avec ou sans le préfixe de bucket : on tolère
-- les deux formes pour rester robuste (seed historique vs uploads applicatifs).
-- ============================================================================
create policy "preuves_portail_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'preuves'
    and exists (
      select 1
      from public.preuves_produit p
      join public.lots l on l.id = p.lot_id
      join public.client_users cu on cu.client_id = l.client_id
      where cu.user_id = auth.uid()
        and p.visible_client = true
        and (p.storage_path = name or p.storage_path = 'preuves/' || name)
    )
  );
