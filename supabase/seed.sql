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

-- ── Origines (traçabilité champ, M0b — connecteur Cropwise) ─────────────────
-- Deux sites de production distincts → traçabilité multi-sites (Brique 8).
insert into public.origines (lot_id, site, parcelle, variete, date_recolte, traitements, ref) values
  ('d0000000-0000-4000-8000-000000000001', 'Al Batoul — New Cairo', 'P-07', 'Beauregard',  '2026-03-08', '{"Irrigation goutte-à-goutte"}', 'CAAU4027760'),
  ('d0000000-0000-4000-8000-000000000002', 'Al Batoul — New Cairo', 'P-02', 'Inspiration', '2026-05-04', '{"Culture âgée à la récolte"}', 'OLMP2605160'),
  ('d0000000-0000-4000-8000-000000000003', 'Al Batoul — New Cairo', 'P-03', 'Inspiration', '2026-03-28', '{}', 'TCLU4239771'),
  ('d0000000-0000-4000-8000-000000000004', 'Al Batoul — New Cairo', 'P-11', 'Bellevue',     '2026-05-10', '{"Plants certifiés indemnes Thrips palmi"}', 'OTPU6220580'),
  ('d0000000-0000-4000-8000-000000000005', 'El Saada — Ismailia',   'ES-04', NULL,          '2026-06-25', '{}', 'MEDU7781204'),
  ('d0000000-0000-4000-8000-000000000006', 'El Saada — Ismailia',   'ES-06', NULL,          '2026-06-10', '{}', 'LOT-2026-0006'),
  ('d0000000-0000-4000-8000-000000000007', 'El Saada — Ismailia',   'ES-01', NULL,          '2026-01-02', '{"Sensible Botrytis — humidité surveillée"}', 'LOT-2026-0007');

-- ── Documents (Brique 3 : + métadonnées extraites pour la vérification IA) ───
-- Les clés `metadata` sont en camelCase (lues telles quelles côté data layer).
insert into public.documents (id, lot_id, type, nom_fichier, storage_path, statut, metadata) values
  -- Lot 1 (patate douce) — dossier partiel (facture + packing), cohérent
  ('f0000000-0000-4000-8000-000000000101', 'd0000000-0000-4000-8000-000000000001', 'facture',      'INV-02-024-140326.pdf', 'documents/LOT-2026-0001/facture.pdf', 'recu',
   '{"numeroConteneur":"CAAU4027760","codeHs":"07142000","poidsBrutKg":24800,"poidsNetKg":24000,"quantite":24,"unite":"t"}'),
  ('f0000000-0000-4000-8000-000000000102', 'd0000000-0000-4000-8000-000000000001', 'packing_list', 'PL-02-024.pdf',         'documents/LOT-2026-0001/packing.pdf', 'recu',
   '{"numeroConteneur":"CAAU4027760","poidsBrutKg":24800,"poidsNetKg":24000,"quantite":24,"unite":"t"}'),

  -- Lot 3 (Bimi #4 sain) — JEU COHÉRENT complet → Gate verte attendue
  ('f0000000-0000-4000-8000-000000000301', 'd0000000-0000-4000-8000-000000000003', 'facture',      'INV-04-01-310326.pdf',  'documents/LOT-2026-0003/facture.pdf', 'recu',
   '{"numeroConteneur":"TCLU4239771","codeHs":"07041000","poidsBrutKg":5200,"poidsNetKg":4800,"quantite":800,"unite":"cartons"}'),
  ('f0000000-0000-4000-8000-000000000302', 'd0000000-0000-4000-8000-000000000003', 'bl',           'MBL-04-01.pdf',         'documents/LOT-2026-0003/mbl.pdf',     'recu',
   '{"numeroConteneur":"TCLU4239771","poidsBrutKg":5200,"quantite":800,"unite":"cartons"}'),
  ('f0000000-0000-4000-8000-000000000303', 'd0000000-0000-4000-8000-000000000003', 'phyto',        'PHYTO-04-01.pdf',       'documents/LOT-2026-0003/phyto.pdf',   'recu',
   '{"numeroConteneur":"TCLU4239771","declarationAdditionnelle":["Thrips palmi","Bemisia tabaci","Liriomyza sativae","Nemorimyza maculosa"]}'),
  ('f0000000-0000-4000-8000-000000000304', 'd0000000-0000-4000-8000-000000000003', 'packing_list', 'PL-04-01.pdf',          'documents/LOT-2026-0003/packing.pdf', 'recu',
   '{"numeroConteneur":"TCLU4239771","poidsBrutKg":5200,"poidsNetKg":4800,"quantite":800,"unite":"cartons"}'),

  -- Lot 4 (slips Voltz) — JEU INCOHÉRENT → Gate rouge attendue
  --   • n° conteneur facture OTPU6220580 vs BL OTPU6220589
  --   • poids brut facture 520 vs packing 560
  --   • code HS 07142000 (tubercule) au lieu d'un plant vivant (06029050)
  --   • phyto sans Déclaration Additionnelle + sans mention règlement 2021/2285
  ('f0000000-0000-4000-8000-000000000401', 'd0000000-0000-4000-8000-000000000004', 'facture',      'INV-slips.pdf',         'documents/LOT-2026-0004/facture.pdf', 'recu',
   '{"numeroConteneur":"OTPU6220580","codeHs":"07142000","poidsBrutKg":520,"poidsNetKg":500,"quantite":20000,"unite":"slips"}'),
  ('f0000000-0000-4000-8000-000000000402', 'd0000000-0000-4000-8000-000000000004', 'bl',           'HBL-slips.pdf',         'documents/LOT-2026-0004/hbl.pdf',     'recu',
   '{"numeroConteneur":"OTPU6220589","poidsBrutKg":520,"quantite":20000,"unite":"slips"}'),
  ('f0000000-0000-4000-8000-000000000403', 'd0000000-0000-4000-8000-000000000004', 'phyto',        'PHYTO-slips.pdf',       'documents/LOT-2026-0004/phyto.pdf',   'recu',
   '{"numeroConteneur":"OTPU6220580","declarationAdditionnelle":[],"reglement20212285":false}'),
  ('f0000000-0000-4000-8000-000000000404', 'd0000000-0000-4000-8000-000000000004', 'packing_list', 'PL-slips.pdf',          'documents/LOT-2026-0004/packing.pdf', 'recu',
   '{"numeroConteneur":"OTPU6220580","poidsBrutKg":560,"poidsNetKg":500,"quantite":20000,"unite":"slips"}');

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

-- ── Rapports qualité (analysés par IA — Brique 6) ────────────────────────────
-- `analyse` reproduit la sortie du QcAnalyzerProvider (mock déterministe). Les
-- deux retours présents dans la boîte mock (email_id renseigné) sont ré-importés
-- de façon idempotente depuis le Hub email (/qualite) ; les deux autres sont
-- des analyses historiques alimentant directement les tendances.
insert into public.rapports_qualite
  (lot_id, source, verdict, score, defauts, recu_le, storage_path,
   email_id, nom_fichier, resume, model, analyse_ia, analyse_le)
values
  -- QCCheck_986640 (Tenderstem, ROUGE 84) — rattaché au lot Bimi rejeté (OLMP2605160)
  ('d0000000-0000-4000-8000-000000000002', 'retour_client', 'rouge', 84,
   '{"Floraison","Florets ouverts","Tiges creuses","Mauvais parage","Sur-diamètre / sur-longueur"}',
   '2026-03-19', 'retours-qc/QCCheck_986640.pdf',
   'eml-qc-986640', 'QCCheck_986640.pdf',
   'Tenderstem RM 6 kg âgé (~12 j) : floraison marquée et tiges creuses. QA Flag ROUGE.',
   'mock-qc-analyzer-deterministic',
   '{"score":84,"verdict":"rouge","model":"mock-qc-analyzer-deterministic","resume":"Tenderstem RM 6 kg âgé (~12 j) : floraison marquée et tiges creuses. QA Flag ROUGE.","defauts":[{"code":"floraison","libelle":"Floraison","categorie":"aspect","severite":"majeur"},{"code":"florets-ouverts","libelle":"Florets ouverts","categorie":"aspect","severite":"majeur"},{"code":"tiges-creuses","libelle":"Tiges creuses","categorie":"aspect","severite":"majeur"},{"code":"parage","libelle":"Mauvais parage","categorie":"parage","severite":"mineur"},{"code":"sur-diametre","libelle":"Sur-diamètre / sur-longueur","categorie":"calibre","severite":"mineur"}]}'::jsonb,
   '2026-03-19T11:30:00+00:00'),
  -- QCCheck_995769 (Tenderstem, majorité VERT ~91) — analyse historique
  ('d0000000-0000-4000-8000-000000000003', 'retour_client', 'vert', 91,
   '{"Floraison","Parage","Sur-longueur","Tiges creuses"}',
   '2026-04-22', 'retours-qc/QCCheck_995769.pdf',
   null, 'QCCheck_995769.pdf',
   'Tenderstem RM 6 kg majoritairement conforme (2 checks rouges sur floraison/parage).',
   'mock-qc-analyzer-deterministic',
   '{"score":91,"verdict":"vert","model":"mock-qc-analyzer-deterministic","resume":"Tenderstem RM 6 kg majoritairement conforme (2 checks rouges sur floraison/parage).","defauts":[{"code":"floraison","libelle":"Floraison","categorie":"aspect","severite":"mineur"},{"code":"parage","libelle":"Parage","categorie":"parage","severite":"mineur"},{"code":"sur-longueur","libelle":"Sur-longueur","categorie":"calibre","severite":"mineur"},{"code":"tiges-creuses","libelle":"Tiges creuses","categorie":"aspect","severite":"mineur"}]}'::jsonb,
   '2026-04-22T09:00:00+00:00'),
  -- QR patate douce SHAHD EL MALIKA (CAAU4027760, note 7/10 "Fair")
  ('d0000000-0000-4000-8000-000000000001', 'retour_client', 'orange', 70,
   '{"Radicelles","Cicatrices","Germination précoce","Sous-calibres"}',
   '2026-06-01', 'retours-qc/BR41239_CAAU4027760_QR.pdf',
   'eml-sweetpotato-qr', 'BR41239_CAAU4027760_QR.pdf',
   'Patate douce SHAHD EL MALIKA — note « Fair » : radicelles ~30 % (non-conforme L2), re-calibrage.',
   'mock-qc-analyzer-deterministic',
   '{"score":70,"verdict":"orange","model":"mock-qc-analyzer-deterministic","resume":"Patate douce SHAHD EL MALIKA — note « Fair » : radicelles ~30 % (non-conforme L2), re-calibrage.","defauts":[{"code":"radicelles","libelle":"Radicelles","categorie":"aspect","severite":"majeur","tauxPct":30},{"code":"cicatrices","libelle":"Cicatrices","categorie":"aspect","severite":"mineur"},{"code":"germination-precoce","libelle":"Germination précoce","categorie":"maturite","severite":"mineur"},{"code":"sous-calibres","libelle":"Sous-calibres","categorie":"calibre","severite":"mineur"}]}'::jsonb,
   '2026-06-01T08:10:00+00:00'),
  -- Fraise (Botrytis) — analyse historique (pas de PDF dans le workspace)
  ('d0000000-0000-4000-8000-000000000007', 'retour_client', 'rouge', 55,
   '{"Botrytis","Fruits immatures","Fruits mous / marqués","Collets blancs"}',
   '2026-01-08', NULL,
   null, null,
   'Fraise ELSAADA — code tri élevé (4) : Botrytis et fruits immatures au-dessus des seuils.',
   'mock-qc-analyzer-deterministic',
   '{"score":55,"verdict":"rouge","model":"mock-qc-analyzer-deterministic","resume":"Fraise ELSAADA — code tri élevé (4) : Botrytis et fruits immatures au-dessus des seuils.","defauts":[{"code":"botrytis","libelle":"Botrytis","categorie":"sanitaire","severite":"critique","tauxPct":4.5},{"code":"fruits-immatures","libelle":"Fruits immatures","categorie":"maturite","severite":"majeur","tauxPct":7.5},{"code":"fruits-mous","libelle":"Fruits mous / marqués","categorie":"aspect","severite":"mineur"},{"code":"collets-blancs","libelle":"Collets blancs","categorie":"aspect","severite":"mineur"}]}'::jsonb,
   '2026-01-08T10:00:00+00:00');

-- ── Preuves produit (photo boîte visible client) ─────────────────────────────
insert into public.preuves_produit (lot_id, type, storage_path, prise_le, visible_client) values
  ('d0000000-0000-4000-8000-000000000003', 'photo_boite',  'preuves/LOT-2026-0003/boite.jpg',      '2026-04-02T10:00:00+02:00', true),
  ('d0000000-0000-4000-8000-000000000003', 'qr_chargement','preuves/LOT-2026-0003/qr-charg.png',   '2026-04-02T09:30:00+02:00', false),
  ('d0000000-0000-4000-8000-000000000001', 'photo_boite',  'preuves/LOT-2026-0001/boite.jpg',      '2026-03-15T14:30:00+02:00', true);

-- ── Planning prévu / réalisé (Brique 5 — M3) ─────────────────────────────────
-- Chaque ligne = un DÉPART PRÉVU pour une semaine ISO, rapproché du réalisé via
-- lot_id. On couvre trois états pour la démo :
--   • RÉALISÉ  : lot parti la semaine prévue (semaine planning == semaine départ).
--   • GLISSEMENT : lot parti mais décalé d'une ou plusieurs semaines (LOT-0002).
--   • PLANIFIÉ : pas encore parti (lot en booking, ou aucun lot rattaché).
insert into public.planning
  (semaine_iso, semaine_debut, client_id, client_nom, produit, variete,
   destination_pays, destination_port, quantite_prevue, unite, lot_id, source, notes)
values
  -- RÉALISÉS (parti la semaine prévue)
  ('2026-W02', '2026-01-05', 'b0000000-0000-4000-8000-000000000005', 'Les Fruits Rouges & Co', 'Fraise', NULL,
   'FR', 'CDG', 2.5, 't', 'd0000000-0000-4000-8000-000000000007', 'seed', NULL),
  ('2026-W12', '2026-03-16', 'b0000000-0000-4000-8000-000000000002', 'Georges Helfer SA', 'Patate douce', 'Beauregard',
   'FR', 'Marseille/Fos', 24, 't', 'd0000000-0000-4000-8000-000000000001', 'seed', NULL),
  ('2026-W14', '2026-03-30', 'b0000000-0000-4000-8000-000000000001', 'Barfoots of Botley Ltd', 'Tenderstem / Bimi', 'Inspiration',
   'UK', 'Trieste → Bognor Regis', 1200, 'cartons', 'd0000000-0000-4000-8000-000000000003', 'seed', 'RoRo #4 — départ conforme au planning.'),
  ('2026-W20', '2026-05-11', 'b0000000-0000-4000-8000-000000000003', 'Graines Voltz SAS', 'Plants patate douce (slips)', 'Bellevue',
   'NL', 'Amsterdam (AMS)', 20000, 'slips', 'd0000000-0000-4000-8000-000000000004', 'seed', NULL),
  ('2026-W27', '2026-06-29', 'b0000000-0000-4000-8000-000000000004', 'Exo3', 'Ail', NULL,
   'FR', 'Marseille', 18, 't', 'd0000000-0000-4000-8000-000000000005', 'seed', 'WK29 Exo3.'),

  -- GLISSEMENT (prévu W19, LOT-0002 parti en W20 : culture âgée + retard de départ)
  ('2026-W19', '2026-05-04', 'b0000000-0000-4000-8000-000000000001', 'Barfoots of Botley Ltd', 'Tenderstem / Bimi', 'Inspiration',
   'UK', 'Trieste → Bognor Regis', 1200, 'cartons', 'd0000000-0000-4000-8000-000000000002', 'seed', 'Départ glissé d''une semaine.'),

  -- PLANIFIÉS (pas encore partis)
  ('2026-W27', '2026-06-29', 'b0000000-0000-4000-8000-000000000006', 'JSC Grand-Trade', 'Ail', NULL,
   'RU', 'Novorossiysk', 22, 't', 'd0000000-0000-4000-8000-000000000006', 'seed', 'En booking — départ à confirmer.'),
  ('2026-W28', '2026-07-06', 'b0000000-0000-4000-8000-000000000001', 'Barfoots of Botley Ltd', 'Tenderstem / Bimi', 'Inspiration',
   'UK', 'Trieste → Bognor Regis', 1200, 'cartons', NULL, 'seed', NULL),
  ('2026-W29', '2026-07-13', 'b0000000-0000-4000-8000-000000000004', 'Exo3', 'Ail', NULL,
   'FR', 'Marseille', 18, 't', NULL, 'seed', NULL);

-- ── Coffre à certifications (Brique 7 — M0c) ─────────────────────────────────
-- Couverture calquée sur la base de connaissance §6 : brocoli, fraise, patate
-- douce, ail, slips couverts par GGAP/GRASP ; **mangue NON couverte**. BRCGS /
-- SMETA / Sedex couvrent l'ensemble (packhouse + audit social). Une certif
-- (Sedex) est volontairement proche de l'expiration → alerte.
insert into public.certifications
  (id, type, organisme, numero, produits, pays, date_obtention, date_expiration, statut, notes)
values
  ('a1000000-0000-4000-8000-000000000001', 'ggap',  'GlobalG.A.P.',   'GGN-4049928000000',
   '{"brocoli","slips","patate_douce","ail","fraise"}', '{"ALL"}', '2025-04-01', '2027-03-31', 'valide',
   'Mangue non couverte (onboarding SHP en cours).'),
  ('a1000000-0000-4000-8000-000000000002', 'grasp', 'GRASP (add-on GGAP)', 'GRASP-2025',
   '{"brocoli","slips","patate_douce","ail","fraise"}', '{"ALL"}', '2025-04-01', '2027-03-31', 'valide',
   'Module social lié à GGAP — mangue non couverte.'),
  ('a1000000-0000-4000-8000-000000000003', 'brcgs', 'BRCGS (packhouse Al Batoul)', 'BRC-882140',
   '{"ALL"}', '{"ALL"}', '2025-09-15', '2027-01-15', 'valide', NULL),
  ('a1000000-0000-4000-8000-000000000004', 'smeta', 'SMETA (Partner Africa)', 'SMETA-6-2025',
   '{"ALL"}', '{"ALL"}', '2025-11-20', '2026-12-01', 'valide', 'Audit social 4 piliers.'),
  ('a1000000-0000-4000-8000-000000000005', 'sedex', 'Sedex', 'ZC-2024-778',
   '{"ALL"}', '{"ALL"}', '2024-07-25', '2026-07-25', 'valide', 'À renouveler — proche expiration.');

-- ── Demande de démonstration (Brique 7 — M1) ─────────────────────────────────
-- Cas "mangue → UK" (SHP Tropical) : GGAP/GRASP mangue manquants → insuffisant,
-- workflow de correction. Le cas "brocoli → UK" (suffisant, envoi auto) est
-- rejoué à la demande depuis l'UI / l'E2E.
insert into public.demandes
  (id, client_id, client_nom, contact_email, produit, pays, volume,
   statut, decision, raison, certifs_requises, certifs_manquantes)
values
  ('a2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000007',
   'SHP Tropical Ltd', 'ed.wright@shpratt.com', 'Mangue', 'UK', 'pré-découpe',
   'en_correction', 'insuffisant',
   'Certification(s) manquante(s) : GlobalG.A.P., GRASP.',
   '{"GlobalG.A.P.","GRASP","BRCGS","SMETA","Sedex"}',
   '{"GlobalG.A.P.","GRASP"}');

insert into public.taches_correction
  (demande_id, certif_type, produit, pays, libelle, statut)
values
  ('a2000000-0000-4000-8000-000000000001', 'ggap', 'Mangue', 'UK',
   'Obtenir/étendre GlobalG.A.P. — GlobalG.A.P. ne couvre pas Mangue → UK.', 'a_faire'),
  ('a2000000-0000-4000-8000-000000000001', 'grasp', 'Mangue', 'UK',
   'Obtenir/étendre GRASP — GRASP ne couvre pas Mangue → UK.', 'a_faire');

-- ── M10 — Finance légère (Brique 8) ──────────────────────────────────────────
-- Statut de paiement par lot (suivi, pas un moteur comptable).
insert into public.paiements (lot_id, statut, montant, devise, echeance, paye_le, notes) values
  ('d0000000-0000-4000-8000-000000000001', 'paye',       22800, 'EUR', '2026-04-13', '2026-04-10', NULL),
  ('d0000000-0000-4000-8000-000000000002', 'litige',      9800, 'EUR', '2026-06-15', NULL,          'Paiement suspendu — lot détruit, certificat en attente de validation client.'),
  ('d0000000-0000-4000-8000-000000000003', 'paye',       10680, 'EUR', '2026-04-30', '2026-04-28', NULL),
  ('d0000000-0000-4000-8000-000000000004', 'litige',      2400, 'EUR', '2026-06-01', NULL,          'Documents retenus par Voltz suite au litige (facture contestée).'),
  ('d0000000-0000-4000-8000-000000000005', 'en_attente', 27000, 'EUR', '2026-08-01', NULL,          NULL),
  ('d0000000-0000-4000-8000-000000000006', 'a_venir',    33000, 'EUR', '2026-08-15', NULL,          NULL),
  ('d0000000-0000-4000-8000-000000000007', 'partiel',    10500, 'EUR', '2026-02-15', '2026-02-10',  'Avoir partiel appliqué suite au retour qualité (Botrytis).');

-- Litige type Voltz (facture contestée, documents bloqués) sur le lot slips.
insert into public.litiges (lot_id, type, statut, montant_conteste, devise, description) values
  ('d0000000-0000-4000-8000-000000000004', 'facture_contestee', 'en_cours', 2400, 'EUR',
   'Graines Voltz conteste la facture suite à la détention phytosanitaire (Bemisia/thrips) et retient les documents de paiement.'),
  ('d0000000-0000-4000-8000-000000000005', 'sous_evaluation_douaniere', 'ouvert', NULL, 'EUR',
   'Écart signalé entre facture commerciale (1,50 €/kg) et déclaration douanière (0,50 €/kg) — à corriger avant tout nouvel envoi.');

-- Certificat de destruction — lot Bimi RoRo "fatigué" rejeté (Barfoots).
insert into public.certificats_destruction (lot_id, motif, quantite, unite, emis_le) values
  ('d0000000-0000-4000-8000-000000000002', 'Lot dégradé à l''arrivée (culture âgée + excursion température) — refusé par le client.', 1200, 'cartons', '2026-06-02');

-- ── M4 — Dossiers de réservation (Brique 9) ──────────────────────────────────
-- Les 3 statuts du cycle de vie : brouillon (dossier généré, pas encore
-- envoyé), envoyé (dossier transmis via un canal — libre, non contraint) et
-- confirmé (booking confirmé → lot créé, cf. `lot_id`).
insert into public.demandes_booking
  (id, commande_id, client_id, produit, variete, quantite, unite, incoterm,
   destination_pays, destination_port, mode, date_souhaitee, dossier_texte, statut, canal, envoyee_le, lot_id)
values
  -- Brouillon : projet mangue SHP (onboarding en cours, cf. Brique 7) — pas encore envoyé.
  ('a3000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000007',
   'b0000000-0000-4000-8000-000000000007', 'Mangue', 'Class I', NULL, 't', 'DAP',
   'UK', NULL, 'air', '2026-08-01',
   E'DOSSIER DE RÉSERVATION — NATURAL KISS\n\nClient : SHP Tropical Ltd\nProduit : Mangue (Class I)\nIncoterm : DAP\nDestination : UK\nMode de transport souhaité : Aérien\nDate de départ souhaitée : 2026-08-01\n\nMerci de confirmer : n° de conteneur, transporteur, date de départ.',
   'brouillon', NULL, NULL, NULL),

  -- Envoyé : prochain départ Tenderstem Barfoots — dossier transmis par mail au transporteur direct.
  ('a3000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'Tenderstem / Bimi', 'Inspiration', 1200, 'cartons', 'DAP',
   'UK', 'Bognor Regis', 'roro', '2026-07-17',
   E'DOSSIER DE RÉSERVATION — NATURAL KISS\n\nClient : Barfoots of Botley Ltd\nProduit : Tenderstem / Bimi (Inspiration)\nQuantité : 1200 cartons\nIncoterm : DAP\nDestination : Bognor Regis, UK\nMode de transport souhaité : RoRo\nDate de départ souhaitée : 2026-07-17\n\nMerci de confirmer : n° de conteneur, transporteur, date de départ.',
   'envoye', 'email transporteur direct (DFDS)', '2026-07-09T09:00:00+02:00', NULL),

  -- Confirmé : booking Ail Exo3 déjà transformé en lot (LOT-2026-0005, en transit).
  ('a3000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000004',
   'b0000000-0000-4000-8000-000000000004', 'Ail', NULL, 18, 't', 'FOB',
   'FR', 'Marseille', 'sea', '2026-07-03',
   E'DOSSIER DE RÉSERVATION — NATURAL KISS\n\nClient : Exo3\nProduit : Ail\nQuantité : 18 t\nIncoterm : FOB\nDestination : Marseille, FR\nMode de transport souhaité : Maritime\nDate de départ souhaitée : 2026-07-03\n\nMerci de confirmer : n° de conteneur, transporteur, date de départ.',
   'confirme', 'portail transporteur (Total Cargo)', '2026-07-01T10:00:00+02:00',
   'd0000000-0000-4000-8000-000000000005');
