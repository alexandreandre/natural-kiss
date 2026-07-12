// ============================================================================
// Top-up idempotent des données de démo Brique 9 (M4 — Booking) sur un projet
// Supabase CLOUD, via la service role (aucun psql requis).
//
// Aligné sur supabase/seed.sql : 3 dossiers de réservation illustrant le cycle
// de vie complet (brouillon → envoyé → confirmé, ce dernier déjà lié au lot
// LOT-2026-0005).
//
//   node scripts/seed-booking.mjs
// ============================================================================
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import WS from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WS;
}

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (.env.local).",
  );
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const SHP_ID = "b0000000-0000-4000-8000-000000000007";
const BARFOOTS_ID = "b0000000-0000-4000-8000-000000000001";
const EXO3_ID = "b0000000-0000-4000-8000-000000000004";
const CMD_SHP = "e0000000-0000-4000-8000-000000000007";
const CMD_BARFOOTS = "e0000000-0000-4000-8000-000000000001";
const CMD_EXO3 = "e0000000-0000-4000-8000-000000000004";
const LOT_EXO3_AIL = "d0000000-0000-4000-8000-000000000005";

const DEMANDES = [
  {
    id: "a3000000-0000-4000-8000-000000000001",
    commande_id: CMD_SHP,
    client_id: SHP_ID,
    produit: "Mangue",
    variete: "Class I",
    quantite: null,
    unite: "t",
    incoterm: "DAP",
    destination_pays: "UK",
    destination_port: null,
    mode: "air",
    date_souhaitee: "2026-08-01",
    dossier_texte:
      "DOSSIER DE RÉSERVATION — NATURAL KISS\n\nClient : SHP Tropical Ltd\nProduit : Mangue (Class I)\nIncoterm : DAP\nDestination : UK\nMode de transport souhaité : Aérien\nDate de départ souhaitée : 2026-08-01\n\nMerci de confirmer : n° de conteneur, transporteur, date de départ.",
    statut: "brouillon",
    canal: null,
    envoyee_le: null,
    lot_id: null,
  },
  {
    id: "a3000000-0000-4000-8000-000000000002",
    commande_id: CMD_BARFOOTS,
    client_id: BARFOOTS_ID,
    produit: "Tenderstem / Bimi",
    variete: "Inspiration",
    quantite: 1200,
    unite: "cartons",
    incoterm: "DAP",
    destination_pays: "UK",
    destination_port: "Bognor Regis",
    mode: "roro",
    date_souhaitee: "2026-07-17",
    dossier_texte:
      "DOSSIER DE RÉSERVATION — NATURAL KISS\n\nClient : Barfoots of Botley Ltd\nProduit : Tenderstem / Bimi (Inspiration)\nQuantité : 1200 cartons\nIncoterm : DAP\nDestination : Bognor Regis, UK\nMode de transport souhaité : RoRo\nDate de départ souhaitée : 2026-07-17\n\nMerci de confirmer : n° de conteneur, transporteur, date de départ.",
    statut: "envoye",
    canal: "email transporteur direct (DFDS)",
    envoyee_le: "2026-07-09T09:00:00+02:00",
    lot_id: null,
  },
  {
    id: "a3000000-0000-4000-8000-000000000003",
    commande_id: CMD_EXO3,
    client_id: EXO3_ID,
    produit: "Ail",
    variete: null,
    quantite: 18,
    unite: "t",
    incoterm: "FOB",
    destination_pays: "FR",
    destination_port: "Marseille",
    mode: "sea",
    date_souhaitee: "2026-07-03",
    dossier_texte:
      "DOSSIER DE RÉSERVATION — NATURAL KISS\n\nClient : Exo3\nProduit : Ail\nQuantité : 18 t\nIncoterm : FOB\nDestination : Marseille, FR\nMode de transport souhaité : Maritime\nDate de départ souhaitée : 2026-07-03\n\nMerci de confirmer : n° de conteneur, transporteur, date de départ.",
    statut: "confirme",
    canal: "portail transporteur (Total Cargo)",
    envoyee_le: "2026-07-01T10:00:00+02:00",
    lot_id: LOT_EXO3_AIL,
  },
];

let count = 0;
for (const d of DEMANDES) {
  const { error } = await supabase.from("demandes_booking").upsert(d, { onConflict: "id" });
  if (error) throw error;
  count += 1;
}

console.log(`✓ Dossiers de booking synchronisés — ${count} dossier(s).`);
