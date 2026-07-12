// ============================================================================
// Top-up idempotent des données de démo Brique 7 (Demande & Onboarding) sur un
// projet Supabase CLOUD, via la service role (aucun psql requis).
//
// Aligné sur supabase/seed.sql : coffre M0c (GGAP/GRASP couvrant tout SAUF la
// mangue ; Sedex proche de l'expiration) + une demande "mangue → UK" insuffisante
// avec son workflow de correction.
//
//   node scripts/seed-onboarding.mjs
//
// (Le local/CI passe par supabase/seed.sql lors de `supabase db reset`.)
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

// ── Coffre à certifications (une ligne par type — unique index sur `type`) ─────
const CERTIFS = [
  {
    type: "ggap",
    organisme: "GlobalG.A.P.",
    numero: "GGN-4049928000000",
    produits: ["brocoli", "slips", "patate_douce", "ail", "fraise"],
    pays: ["ALL"],
    date_obtention: "2025-04-01",
    date_expiration: "2027-03-31",
    statut: "valide",
    notes: "Mangue non couverte (onboarding SHP en cours).",
  },
  {
    type: "grasp",
    organisme: "GRASP (add-on GGAP)",
    numero: "GRASP-2025",
    produits: ["brocoli", "slips", "patate_douce", "ail", "fraise"],
    pays: ["ALL"],
    date_obtention: "2025-04-01",
    date_expiration: "2027-03-31",
    statut: "valide",
    notes: "Module social lié à GGAP — mangue non couverte.",
  },
  {
    type: "brcgs",
    organisme: "BRCGS (packhouse Al Batoul)",
    numero: "BRC-882140",
    produits: ["ALL"],
    pays: ["ALL"],
    date_obtention: "2025-09-15",
    date_expiration: "2027-01-15",
    statut: "valide",
    notes: null,
  },
  {
    type: "smeta",
    organisme: "SMETA (Partner Africa)",
    numero: "SMETA-6-2025",
    produits: ["ALL"],
    pays: ["ALL"],
    date_obtention: "2025-11-20",
    date_expiration: "2026-12-01",
    statut: "valide",
    notes: "Audit social 4 piliers.",
  },
  {
    type: "sedex",
    organisme: "Sedex",
    numero: "ZC-2024-778",
    produits: ["ALL"],
    pays: ["ALL"],
    date_obtention: "2024-07-25",
    date_expiration: "2026-07-25",
    statut: "valide",
    notes: "À renouveler — proche expiration.",
  },
];

let certifs = 0;
for (const c of CERTIFS) {
  const { error } = await supabase
    .from("certifications")
    .upsert(c, { onConflict: "type" });
  if (error) throw error;
  certifs += 1;
}

// ── Demande de démonstration "mangue → UK" (insuffisante) + tâches ────────────
const DEMANDE_ID = "a2000000-0000-4000-8000-000000000001";
const SHP_CLIENT_ID = "b0000000-0000-4000-8000-000000000007";

const { error: dErr } = await supabase.from("demandes").upsert(
  {
    id: DEMANDE_ID,
    client_id: SHP_CLIENT_ID,
    client_nom: "SHP Tropical Ltd",
    contact_email: "ed.wright@shpratt.com",
    produit: "Mangue",
    pays: "UK",
    volume: "pré-découpe",
    statut: "en_correction",
    decision: "insuffisant",
    raison: "Certification(s) manquante(s) : GlobalG.A.P., GRASP.",
    certifs_requises: ["GlobalG.A.P.", "GRASP", "BRCGS", "SMETA", "Sedex"],
    certifs_manquantes: ["GlobalG.A.P.", "GRASP"],
  },
  { onConflict: "id" },
);
if (dErr) throw dErr;

// Tâches : remplacement complet pour rester idempotent.
await supabase.from("taches_correction").delete().eq("demande_id", DEMANDE_ID);
const { error: tErr } = await supabase.from("taches_correction").insert([
  {
    demande_id: DEMANDE_ID,
    certif_type: "ggap",
    produit: "Mangue",
    pays: "UK",
    libelle: "Obtenir/étendre GlobalG.A.P. — GlobalG.A.P. ne couvre pas Mangue → UK.",
    statut: "a_faire",
  },
  {
    demande_id: DEMANDE_ID,
    certif_type: "grasp",
    produit: "Mangue",
    pays: "UK",
    libelle: "Obtenir/étendre GRASP — GRASP ne couvre pas Mangue → UK.",
    statut: "a_faire",
  },
]);
if (tErr) throw tErr;

console.log(
  `✓ Coffre & demande synchronisés — ${certifs} certification(s), 1 demande + 2 tâches.`,
);
