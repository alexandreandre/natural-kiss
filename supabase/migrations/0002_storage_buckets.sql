-- ============================================================================
-- Brique 0 — Buckets Supabase Storage
--   documents  : facture, BL, phyto, packing list…
--   preuves    : photo boîte produit, QR de chargement
--   retours-qc : PDF de retour qualité client
-- Buckets privés : l'accès passe par la service role (interne) ; les policies
-- d'accès client seront ajoutées avec le portail (Brique 4).
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('documents',  'documents',  false),
  ('preuves',    'preuves',    false),
  ('retours-qc', 'retours-qc', false)
on conflict (id) do nothing;
