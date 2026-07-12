-- ============================================================================
-- Brique 6 — T2 Hub email & IA + M9 Réception & Qualité client
-- ============================================================================
-- Automatise l'entrée des retours qualité par email et leur analyse par IA :
--   • enrichit `rapports_qualite` (Brique 0) avec le résultat structuré de
--     l'analyse IA (défauts catégorisés/sévérité, résumé, modèle, traçabilité
--     du mail d'origine) ;
--   • ajoute un journal d'import email → lot (`qualite_imports`) idempotent, qui
--     trace le rattachement du PDF de retour au bon lot.
-- Le PDF de retour lui-même vit dans le bucket Storage `retours-qc` (Brique 0).
-- RLS activée (deny par défaut) ; accès interne via la service role.
-- ============================================================================

-- ── Statut d'un import email → lot ───────────────────────────────────────────
create type qualite_import_statut as enum ('rattache', 'non_rattache', 'erreur');

-- ── Enrichissement des rapports qualité (sorties de l'analyse IA) ────────────
-- NB : « analyse » est un mot-clé réservé PostgreSQL (ANALYSE) → colonne
-- nommée `analyse_ia`.
alter table public.rapports_qualite
  add column email_id    text,                              -- mail d'origine (T2)
  add column nom_fichier text,                              -- nom du PDF importé
  add column resume      text,                              -- synthèse IA
  add column analyse_ia  jsonb       not null default '{}'::jsonb, -- {defauts[], …}
  add column model       text,                              -- modèle IA utilisé
  add column analyse_le  timestamptz;                       -- horodatage analyse

comment on column public.rapports_qualite.analyse_ia is
  'Analyse IA structurée du PDF de retour : défauts catégorisés + sévérité, '
  'validée par Zod (qcAnalysisSchema) avant écriture.';

-- Un mail (avec son PDF) ne produit qu'un seul rapport → import idempotent.
create unique index rapports_qualite_email_id_uidx
  on public.rapports_qualite (email_id)
  where email_id is not null;

-- ── Journal d'import email → lot (Hub email T2) ──────────────────────────────
create table public.qualite_imports (
  id           uuid primary key default gen_random_uuid(),
  email_id     text not null unique,          -- clé d'idempotence (mail source)
  expediteur   text,
  sujet        text,
  recu_le      timestamptz,
  nom_fichier  text not null,
  lot_id       uuid references public.lots (id) on delete set null,
  rapport_id   uuid references public.rapports_qualite (id) on delete set null,
  statut       qualite_import_statut not null,
  message      text,
  created_at   timestamptz not null default now()
);
create index qualite_imports_lot_id_idx on public.qualite_imports (lot_id);

comment on table public.qualite_imports is
  'Hub email (T2) : trace l''import d''un PDF de retour qualité depuis un mail et '
  'son rattachement au lot. Idempotent par email_id.';

-- ============================================================================
-- RLS — activée (deny par défaut). La service role contourne la RLS.
-- ============================================================================
alter table public.qualite_imports enable row level security;

grant select, insert, update, delete
  on public.qualite_imports
  to anon, authenticated, service_role;
