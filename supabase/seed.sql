-- ============================================================================
-- Brique 0 — Données de démo (rejouées par `supabase db reset`)
-- Calquées sur NATURAL_KISS_Knowledge_Base.md — clients, produits, routes réels.
-- Inclut des CAS "À PROBLÈME" pour tester la valeur IA des briques suivantes :
--   • Lot Bimi maritime "fatigué" rejeté (excursion température)
--   • N° de conteneur incohérent (OTPU6220580 vs OTPU6220589) — slips Voltz
--   • Certificat phytosanitaire incomplet (Déclaration Additionnelle manquante)
-- UUID fixes → tests reproductibles.
-- ============================================================================

-- ── Clients ──────────────────────────────────────────────────────────────────
insert into public.clients (id, nom, pays, ville, contact_nom, contact_email) values
  ('b0000000-0000-4000-8000-000000000001', 'Barfoots of Botley Ltd', 'UK', 'Bognor Regis', 'Kennedy Dellicott', 'technical@barfoots.com'),
  ('b0000000-0000-4000-8000-000000000002', 'Georges Helfer SA',      'FR', 'Rungis',       'Service qualité',    'qualite@georges-helfer.com'),
  ('b0000000-0000-4000-8000-000000000003', 'Graines Voltz SAS',      'FR', 'Colmar',       'Virginie Jouin',     'import@graines-voltz.com'),
  ('b0000000-0000-4000-8000-000000000004', 'Exo3',                   'FR', 'Marseille',    'Achats',             'achats@exo3.fr'),
  ('b0000000-0000-4000-8000-000000000005', 'Les Fruits Rouges & Co', 'FR', 'Laon',         'Qualité',            'qualite@lesfruitsrouges.com'),
  ('b0000000-0000-4000-8000-000000000006', 'JSC Grand-Trade',        'RU', 'Novorossiysk', 'Import',             'import@grand-trade.ru'),
  ('b0000000-0000-4000-8000-000000000007', 'SHP Tropical Ltd',       'UK', 'Spalding',     'Ed Wright',          'ed.wright@shpratt.com');

-- ── Transporteurs ────────────────────────────────────────────────────────────
insert into public.transporteurs (id, nom, mode, contact) values
  ('c0000000-0000-4000-8000-000000000001', 'DFDS (RoRo Olympos Seaways)', 'roro', 'ligne Damietta–Trieste'),
  ('c0000000-0000-4000-8000-000000000002', 'MSC / Borchard',              'sea',  'reefer 40''RF'),
  ('c0000000-0000-4000-8000-000000000003', 'Total Cargo Shipping (TCL)',  'sea',  'Hager Rezk'),
  ('c0000000-0000-4000-8000-000000000004', 'Kuehne + Nagel',              'air',  'Neil O''Brien'),
  ('c0000000-0000-4000-8000-000000000005', 'Wallenborn',                  'road', 'camionnage RoRo → UK'),
  ('c0000000-0000-4000-8000-000000000006', 'Air France Cargo',            'air',  'CDG / AMS');

-- ── Commandes ────────────────────────────────────────────────────────────────
insert into public.commandes (id, reference, client_id, produit, variete, quantite, unite, incoterm, prix_unitaire, devise, pays_destination) values
  ('e0000000-0000-4000-8000-000000000001', 'CMD-BARF-TENDER-04-01', 'b0000000-0000-4000-8000-000000000001', 'Tenderstem / Bimi', 'Inspiration', 1200, 'cartons', 'DAP', 8.90, 'EUR', 'UK'),
  ('e0000000-0000-4000-8000-000000000002', 'CMD-HELFER-SP-02-024',  'b0000000-0000-4000-8000-000000000002', 'Patate douce',      'Beauregard',  24,   't',       'FOB', 0.95, 'EUR', 'FR'),
  ('e0000000-0000-4000-8000-000000000003', 'CMD-VOLTZ-SLIPS-15MAI', 'b0000000-0000-4000-8000-000000000003', 'Plants patate douce (slips)', 'Bellevue', 20000, 'slips', 'FCA', 0.12, 'EUR', 'FR'),
  ('e0000000-0000-4000-8000-000000000004', 'CMD-EXO3-GARLIC-WK29',  'b0000000-0000-4000-8000-000000000004', 'Ail',               NULL,          18,   't',       'FOB', 1.50, 'EUR', 'FR'),
  ('e0000000-0000-4000-8000-000000000005', 'CMD-GT-GARLIC-RU',      'b0000000-0000-4000-8000-000000000006', 'Ail',               NULL,          22,   't',       'CFR', 1.50, 'EUR', 'RU'),
  ('e0000000-0000-4000-8000-000000000006', 'CMD-FR-FRAISE-0108',    'b0000000-0000-4000-8000-000000000005', 'Fraise',            NULL,          2.5,  't',       'FOB', 4.20, 'EUR', 'FR'),
  ('e0000000-0000-4000-8000-000000000007', 'CMD-SHP-MANGUE-PROJ',   'b0000000-0000-4000-8000-000000000007', 'Mangue',            'Class I',     0,    't',       'DAP', NULL, 'EUR', 'UK');

-- ── Lots (objet central) ─────────────────────────────────────────────────────
insert into public.lots
  (id, reference, numero_conteneur, commande_id, client_id, transporteur_id, produit, variete, mode, statut,
   origine_port, destination_port, destination_pays, temperature_consigne_c,
   date_booking, date_depart, date_arrivee_prevue, date_arrivee_reelle, score_risque, notes)
values
  -- 1) Patate douce → Helfer/Marseille — conteneur CAAU4027760 (QR note "Fair" 7/10)
  ('d0000000-0000-4000-8000-000000000001', 'LOT-2026-0001', 'CAAU4027760',
   'e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002',
   'Patate douce', 'Beauregard', 'sea', 'livre',
   'Damietta', 'Marseille/Fos', 'FR', 6,
   '2026-03-14', '2026-03-16T22:00:00+02:00', '2026-03-23T07:00:00+01:00', '2026-03-23T09:30:00+01:00', 35,
   'Radicelles ~30% sur calibre L2 — action corrective : re-calibrage.'),

  -- 2) Bimi RoRo "fatigué" → Barfoots — chargé 16/05, transit ~21j, REJETÉ (CAS PROBLÈME)
  ('d0000000-0000-4000-8000-000000000002', 'LOT-2026-0002', 'OLMP2605160',
   'e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'Tenderstem / Bimi', 'Inspiration', 'roro', 'rejete',
   'Damietta', 'Trieste → Bognor Regis', 'UK', -0.5,
   '2026-05-15', '2026-05-16T23:30:00+02:00', '2026-05-30T10:00:00+01:00', '2026-06-01T10:00:00+01:00', 88,
   'Culture âgée + transit long + excursion température : lot arrivé très dégradé, détruit (certificat de destruction demandé).'),

  -- 3) Bimi RoRo #4 → Barfoots — sain (facture 04-01-310326, Trieste), QC 995769 majorité VERT
  ('d0000000-0000-4000-8000-000000000003', 'LOT-2026-0003', 'TCLU4239771',
   'e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'Tenderstem / Bimi', 'Inspiration', 'roro', 'livre',
   'Damietta', 'Trieste → Bognor Regis', 'UK', -0.5,
   '2026-04-01', '2026-04-02T22:00:00+02:00', '2026-04-16T10:00:00+01:00', '2026-04-16T12:00:00+01:00', 22,
   'RoRo #4 — dédouanement K+N. QC 995769 majoritairement VERT (score ~91).'),

  -- 4) Slips patate douce → Voltz/Amsterdam — CAS PROBLÈME : conteneur incohérent + phyto incomplet
  ('d0000000-0000-4000-8000-000000000004', 'LOT-2026-0004', 'OTPU6220580',
   'e0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000006',
   'Plants patate douce (slips)', 'Bellevue', 'air', 'arrive',
   'Le Caire (CAI)', 'Amsterdam (AMS)', 'NL', 4,
   '2026-05-14', '2026-05-15T22:00:00+02:00', '2026-05-16T02:30:00+02:00', '2026-05-16T02:40:00+02:00', 74,
   'INCOHÉRENCE : n° conteneur facture OTPU6220580 vs BL OTPU6220589. Phyto sans Déclaration Additionnelle (Thrips palmi / Bemisia tabaci) → risque quarantaine NL.'),

  -- 5) Ail → Exo3/Marseille — en transit
  ('d0000000-0000-4000-8000-000000000005', 'LOT-2026-0005', 'MEDU7781204',
   'e0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000003',
   'Ail', NULL, 'sea', 'transit',
   'Alexandrie', 'Marseille', 'FR', 2,
   '2026-07-01', '2026-07-03T20:00:00+02:00', '2026-07-10T08:00:00+02:00', NULL, 30,
   'WK29 Exo3. Écart facture douanière signalé (0,50 vs 1,50 €/kg) — à corriger avant envoi.'),

  -- 6) Ail → Russie/Novorossiysk — booking
  ('d0000000-0000-4000-8000-000000000006', 'LOT-2026-0006', NULL,
   'e0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003',
   'Ail', NULL, 'sea', 'booking',
   'Alexandrie', 'Novorossiysk', 'RU', 2,
   '2026-06-15', NULL, '2026-06-30T08:00:00+03:00', NULL, 40,
   'Exigence RU : MBL/HBL + phyto originaux voyageant avec le navire.'),

  -- 7) Fraise → Les Fruits Rouges (via El Saada) — livré, QC rouge (Botrytis)
  ('d0000000-0000-4000-8000-000000000007', 'LOT-2026-0007', NULL,
   'e0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000006',
   'Fraise', NULL, 'air', 'livre',
   'Le Caire (CAI)', 'CDG', 'FR', 2,
   '2026-01-06', '2026-01-07T02:00:00+02:00', '2026-01-07T07:00:00+01:00', '2026-01-07T07:30:00+01:00', 60,
   'QC 08/01 : Botrytis ~4–5%, fruits immatures ~7–8%, collets blancs.');

-- ── Origines (traçabilité champ, M0b) ────────────────────────────────────────
insert into public.origines (lot_id, site, parcelle, variete, date_recolte, traitements) values
  ('d0000000-0000-4000-8000-000000000001', 'Al Batoul — New Cairo', 'P-07', 'Beauregard',  '2026-03-08', '{"Irrigation goutte-à-goutte"}'),
  ('d0000000-0000-4000-8000-000000000002', 'Al Batoul — New Cairo', 'P-02', 'Inspiration', '2026-05-04', '{"Culture âgée à la récolte"}'),
  ('d0000000-0000-4000-8000-000000000003', 'Al Batoul — New Cairo', 'P-03', 'Inspiration', '2026-03-28', '{}');

-- ── Documents ────────────────────────────────────────────────────────────────
insert into public.documents (lot_id, type, nom_fichier, storage_path, statut) values
  ('d0000000-0000-4000-8000-000000000001', 'facture',      'INV-02-024-140326.pdf', 'documents/LOT-2026-0001/facture.pdf', 'verifie'),
  ('d0000000-0000-4000-8000-000000000001', 'packing_list', 'PL-02-024.pdf',         'documents/LOT-2026-0001/packing.pdf', 'verifie'),
  ('d0000000-0000-4000-8000-000000000003', 'facture',      'INV-04-01-310326.pdf',  'documents/LOT-2026-0003/facture.pdf', 'verifie'),
  ('d0000000-0000-4000-8000-000000000003', 'bl',           'MBL-04-01.pdf',         'documents/LOT-2026-0003/mbl.pdf',     'verifie'),
  -- Cas problème : phyto incomplet
  ('d0000000-0000-4000-8000-000000000004', 'phyto',        'PHYTO-slips.pdf',       'documents/LOT-2026-0004/phyto.pdf',   'anomalie'),
  ('d0000000-0000-4000-8000-000000000004', 'facture',      'INV-slips.pdf',         'documents/LOT-2026-0004/facture.pdf', 'anomalie');

-- ── Événements timeline (pour les lots suivis) ───────────────────────────────
insert into public.evenements_timeline (lot_id, code, label, lieu, mode, at) values
  -- Lot 1 (CAAU4027760)
  ('d0000000-0000-4000-8000-000000000001', 'booking',   'Booking MSC/Borchard',       'Damietta, EG',      'sea',  '2026-03-14T08:00:00+02:00'),
  ('d0000000-0000-4000-8000-000000000001', 'loading',   'Chargement 40''RF',          'Damietta, EG',      'sea',  '2026-03-15T14:00:00+02:00'),
  ('d0000000-0000-4000-8000-000000000001', 'departure', 'Départ navire',              'Damietta, EG',      'sea',  '2026-03-16T22:00:00+02:00'),
  ('d0000000-0000-4000-8000-000000000001', 'arrival',   'Arrivée Marseille/Fos',      'Marseille/Fos, FR', 'sea',  '2026-03-23T07:00:00+01:00'),
  ('d0000000-0000-4000-8000-000000000001', 'delivery',  'Livraison Rungis',           'Rungis, FR',        'road', '2026-03-24T09:00:00+01:00'),
  -- Lot 2 (OLMP2605160 — fatigué)
  ('d0000000-0000-4000-8000-000000000002', 'booking',   'Booking DFDS',               'Damietta, EG',      'roro', '2026-05-15T09:00:00+02:00'),
  ('d0000000-0000-4000-8000-000000000002', 'loading',   'Chargement remorque',        'Damietta, EG',      'roro', '2026-05-16T18:00:00+02:00'),
  ('d0000000-0000-4000-8000-000000000002', 'departure', 'Départ RoRo',                'Damietta, EG',      'roro', '2026-05-16T23:30:00+02:00'),
  ('d0000000-0000-4000-8000-000000000002', 'port_call', 'Débarquement Trieste',       'Trieste, IT',       'roro', '2026-05-25T06:00:00+02:00'),
  ('d0000000-0000-4000-8000-000000000002', 'arrival',   'Arrivée UK — lot dégradé',   'Bognor Regis, UK',  'road', '2026-06-01T10:00:00+01:00');

-- ── Mesures capteur (extrait ; lot 2 montre l'excursion de température) ───────
insert into public.mesures_capteur (lot_id, at, temp_c, humidite_pct, lat, lng) values
  ('d0000000-0000-4000-8000-000000000001', '2026-03-16T22:00:00+02:00', 6.1, 92, 31.42, 31.81),
  ('d0000000-0000-4000-8000-000000000001', '2026-03-19T10:00:00+02:00', 5.8, 93, 37.50, 15.10),
  ('d0000000-0000-4000-8000-000000000001', '2026-03-23T07:00:00+01:00', 6.3, 91, 43.30, 5.36),
  ('d0000000-0000-4000-8000-000000000002', '2026-05-16T23:30:00+02:00', -0.4, 94, 31.42, 31.81),
  ('d0000000-0000-4000-8000-000000000002', '2026-05-21T12:00:00+02:00', 10.9, 88, 37.90, 18.20),  -- excursion
  ('d0000000-0000-4000-8000-000000000002', '2026-05-25T06:00:00+02:00', 0.2, 90, 45.65, 13.77);

-- ── Rapports qualité ─────────────────────────────────────────────────────────
insert into public.rapports_qualite (lot_id, source, verdict, score, defauts, recu_le, storage_path) values
  -- QCCheck_986640 (Tenderstem, ROUGE 84) — rattaché ici au lot Bimi rejeté pour la démo
  ('d0000000-0000-4000-8000-000000000002', 'retour_client', 'rouge', 84,
   '{"Floraison","Florets ouverts","Mauvais parage","Tiges creuses","Sur-diamètre"}', '2026-03-19', 'retours-qc/QCCheck_986640.pdf'),
  -- QCCheck_995769 (Tenderstem, majorité VERT ~91)
  ('d0000000-0000-4000-8000-000000000003', 'retour_client', 'vert', 91,
   '{"Floraison (mineur)","Parage (mineur)"}', '2026-04-22', 'retours-qc/QCCheck_995769.pdf'),
  -- QR patate douce SHAHD EL MALIKA (note 7/10 "Fair")
  ('d0000000-0000-4000-8000-000000000001', 'retour_client', 'orange', 70,
   '{"Radicelles ~30%","Cicatrices","Germination précoce","Sous-calibres"}', '2026-06-01', 'retours-qc/BR41239_CAAU4027760_QR.pdf'),
  -- Fraise (Botrytis)
  ('d0000000-0000-4000-8000-000000000007', 'retour_client', 'rouge', 55,
   '{"Botrytis ~4-5%","Fruits immatures ~7-8%","Fruits mous","Collets blancs"}', '2026-01-08', NULL);

-- ── Preuves produit (photo boîte visible client) ─────────────────────────────
insert into public.preuves_produit (lot_id, type, storage_path, prise_le, visible_client) values
  ('d0000000-0000-4000-8000-000000000003', 'photo_boite',  'preuves/LOT-2026-0003/boite.jpg',      '2026-04-02T10:00:00+02:00', true),
  ('d0000000-0000-4000-8000-000000000003', 'qr_chargement','preuves/LOT-2026-0003/qr-charg.png',   '2026-04-02T09:30:00+02:00', false),
  ('d0000000-0000-4000-8000-000000000001', 'photo_boite',  'preuves/LOT-2026-0001/boite.jpg',      '2026-03-15T14:30:00+02:00', true);
