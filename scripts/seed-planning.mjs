// Provisionne les lignes de PLANNING de démo (Brique 5, M3) dans la base cible.
// Idempotent : remplace les lignes `source='seed'` (les imports 'import' sont
// préservés). Utile pour la base CLOUD (où `seed.sql` n'est pas rejoué) ; sur la
// base LOCALE, `supabase db reset` applique déjà ces mêmes lignes via seed.sql.
//
// Exécuté par `npm run seed`.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import WS from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WS;
}

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "[seed-planning] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (.env.local).",
  );
  process.exit(1);
}

const C = {
  barfoots: "b0000000-0000-4000-8000-000000000001",
  helfer: "b0000000-0000-4000-8000-000000000002",
  voltz: "b0000000-0000-4000-8000-000000000003",
  exo3: "b0000000-0000-4000-8000-000000000004",
  fruitsRouges: "b0000000-0000-4000-8000-000000000005",
  grandTrade: "b0000000-0000-4000-8000-000000000006",
};
const L = {
  l1: "d0000000-0000-4000-8000-000000000001",
  l2: "d0000000-0000-4000-8000-000000000002",
  l3: "d0000000-0000-4000-8000-000000000003",
  l4: "d0000000-0000-4000-8000-000000000004",
  l5: "d0000000-0000-4000-8000-000000000005",
  l6: "d0000000-0000-4000-8000-000000000006",
  l7: "d0000000-0000-4000-8000-000000000007",
};

// Mêmes lignes que supabase/seed.sql (5 réalisés, 1 glissement, 3 à venir).
const ROWS = [
  {
    semaine_iso: "2026-W02",
    semaine_debut: "2026-01-05",
    client_id: C.fruitsRouges,
    client_nom: "Les Fruits Rouges & Co",
    produit: "Fraise",
    variete: null,
    destination_pays: "FR",
    destination_port: "CDG",
    quantite_prevue: 2.5,
    unite: "t",
    lot_id: L.l7,
    source: "seed",
    notes: null,
  },
  {
    semaine_iso: "2026-W12",
    semaine_debut: "2026-03-16",
    client_id: C.helfer,
    client_nom: "Georges Helfer SA",
    produit: "Patate douce",
    variete: "Beauregard",
    destination_pays: "FR",
    destination_port: "Marseille/Fos",
    quantite_prevue: 24,
    unite: "t",
    lot_id: L.l1,
    source: "seed",
    notes: null,
  },
  {
    semaine_iso: "2026-W14",
    semaine_debut: "2026-03-30",
    client_id: C.barfoots,
    client_nom: "Barfoots of Botley Ltd",
    produit: "Tenderstem / Bimi",
    variete: "Inspiration",
    destination_pays: "UK",
    destination_port: "Trieste → Bognor Regis",
    quantite_prevue: 1200,
    unite: "cartons",
    lot_id: L.l3,
    source: "seed",
    notes: "RoRo #4 — départ conforme au planning.",
  },
  {
    semaine_iso: "2026-W20",
    semaine_debut: "2026-05-11",
    client_id: C.voltz,
    client_nom: "Graines Voltz SAS",
    produit: "Plants patate douce (slips)",
    variete: "Bellevue",
    destination_pays: "NL",
    destination_port: "Amsterdam (AMS)",
    quantite_prevue: 20000,
    unite: "slips",
    lot_id: L.l4,
    source: "seed",
    notes: null,
  },
  {
    semaine_iso: "2026-W27",
    semaine_debut: "2026-06-29",
    client_id: C.exo3,
    client_nom: "Exo3",
    produit: "Ail",
    variete: null,
    destination_pays: "FR",
    destination_port: "Marseille",
    quantite_prevue: 18,
    unite: "t",
    lot_id: L.l5,
    source: "seed",
    notes: "WK29 Exo3.",
  },
  {
    semaine_iso: "2026-W19",
    semaine_debut: "2026-05-04",
    client_id: C.barfoots,
    client_nom: "Barfoots of Botley Ltd",
    produit: "Tenderstem / Bimi",
    variete: "Inspiration",
    destination_pays: "UK",
    destination_port: "Trieste → Bognor Regis",
    quantite_prevue: 1200,
    unite: "cartons",
    lot_id: L.l2,
    source: "seed",
    notes: "Départ glissé d'une semaine.",
  },
  {
    semaine_iso: "2026-W27",
    semaine_debut: "2026-06-29",
    client_id: C.grandTrade,
    client_nom: "JSC Grand-Trade",
    produit: "Ail",
    variete: null,
    destination_pays: "RU",
    destination_port: "Novorossiysk",
    quantite_prevue: 22,
    unite: "t",
    lot_id: L.l6,
    source: "seed",
    notes: "En booking — départ à confirmer.",
  },
  {
    semaine_iso: "2026-W28",
    semaine_debut: "2026-07-06",
    client_id: C.barfoots,
    client_nom: "Barfoots of Botley Ltd",
    produit: "Tenderstem / Bimi",
    variete: "Inspiration",
    destination_pays: "UK",
    destination_port: "Trieste → Bognor Regis",
    quantite_prevue: 1200,
    unite: "cartons",
    lot_id: null,
    source: "seed",
    notes: null,
  },
  {
    semaine_iso: "2026-W29",
    semaine_debut: "2026-07-13",
    client_id: C.exo3,
    client_nom: "Exo3",
    produit: "Ail",
    variete: null,
    destination_pays: "FR",
    destination_port: "Marseille",
    quantite_prevue: 18,
    unite: "t",
    lot_id: null,
    source: "seed",
    notes: null,
  },
];

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: delErr } = await supabase.from("planning").delete().eq("source", "seed");
if (delErr) {
  console.error(`[seed-planning] nettoyage échoué : ${delErr.message}`);
  process.exit(1);
}

const { error: insErr } = await supabase.from("planning").insert(ROWS);
if (insErr) {
  console.error(`[seed-planning] insertion échouée : ${insErr.message}`);
  process.exit(1);
}

console.log(
  `[seed-planning] ✓ ${ROWS.length} lignes de planning insérées (source='seed').`,
);
