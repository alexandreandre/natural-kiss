// ============================================================================
// Top-up idempotent des données de démo Gate (Brique 3) sur un projet Supabase
// CLOUD, via la service role (aucun psql / keychain requis).
//
// Aligné sur supabase/seed.sql : métadonnées documentaires + pièces manquantes
// pour les jeux « cohérent » (LOT-2026-0003) et « incohérent » (LOT-2026-0004).
//
//   node scripts/seed-gate.mjs
//
// (Le local/CI passe par supabase/seed.sql lors de `supabase db reset`.)
// ============================================================================
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import WS from "ws";

// Node < 22 : supabase-js (realtime) exige un WebSocket global.
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

/** @type {{lot: string, type: string, nom: string, path: string, metadata: object}[]} */
const DOCS = [
  // LOT-2026-0001 — patate douce (dossier partiel cohérent)
  {
    lot: "LOT-2026-0001",
    type: "facture",
    nom: "INV-02-024-140326.pdf",
    path: "documents/LOT-2026-0001/facture.pdf",
    metadata: {
      numeroConteneur: "CAAU4027760",
      codeHs: "07142000",
      poidsBrutKg: 24800,
      poidsNetKg: 24000,
      quantite: 24,
      unite: "t",
    },
  },
  {
    lot: "LOT-2026-0001",
    type: "packing_list",
    nom: "PL-02-024.pdf",
    path: "documents/LOT-2026-0001/packing.pdf",
    metadata: {
      numeroConteneur: "CAAU4027760",
      poidsBrutKg: 24800,
      poidsNetKg: 24000,
      quantite: 24,
      unite: "t",
    },
  },

  // LOT-2026-0003 — Bimi #4 : JEU COHÉRENT complet → Gate verte
  {
    lot: "LOT-2026-0003",
    type: "facture",
    nom: "INV-04-01-310326.pdf",
    path: "documents/LOT-2026-0003/facture.pdf",
    metadata: {
      numeroConteneur: "TCLU4239771",
      codeHs: "07041000",
      poidsBrutKg: 5200,
      poidsNetKg: 4800,
      quantite: 800,
      unite: "cartons",
    },
  },
  {
    lot: "LOT-2026-0003",
    type: "bl",
    nom: "MBL-04-01.pdf",
    path: "documents/LOT-2026-0003/mbl.pdf",
    metadata: {
      numeroConteneur: "TCLU4239771",
      poidsBrutKg: 5200,
      quantite: 800,
      unite: "cartons",
    },
  },
  {
    lot: "LOT-2026-0003",
    type: "phyto",
    nom: "PHYTO-04-01.pdf",
    path: "documents/LOT-2026-0003/phyto.pdf",
    metadata: {
      numeroConteneur: "TCLU4239771",
      declarationAdditionnelle: [
        "Thrips palmi",
        "Bemisia tabaci",
        "Liriomyza sativae",
        "Nemorimyza maculosa",
      ],
    },
  },
  {
    lot: "LOT-2026-0003",
    type: "packing_list",
    nom: "PL-04-01.pdf",
    path: "documents/LOT-2026-0003/packing.pdf",
    metadata: {
      numeroConteneur: "TCLU4239771",
      poidsBrutKg: 5200,
      poidsNetKg: 4800,
      quantite: 800,
      unite: "cartons",
    },
  },

  // LOT-2026-0004 — slips Voltz : JEU INCOHÉRENT → Gate rouge
  {
    lot: "LOT-2026-0004",
    type: "facture",
    nom: "INV-slips.pdf",
    path: "documents/LOT-2026-0004/facture.pdf",
    metadata: {
      numeroConteneur: "OTPU6220580",
      codeHs: "07142000",
      poidsBrutKg: 520,
      poidsNetKg: 500,
      quantite: 20000,
      unite: "slips",
    },
  },
  {
    lot: "LOT-2026-0004",
    type: "bl",
    nom: "HBL-slips.pdf",
    path: "documents/LOT-2026-0004/hbl.pdf",
    metadata: {
      numeroConteneur: "OTPU6220589",
      poidsBrutKg: 520,
      quantite: 20000,
      unite: "slips",
    },
  },
  {
    lot: "LOT-2026-0004",
    type: "phyto",
    nom: "PHYTO-slips.pdf",
    path: "documents/LOT-2026-0004/phyto.pdf",
    metadata: {
      numeroConteneur: "OTPU6220580",
      declarationAdditionnelle: [],
      reglement20212285: false,
    },
  },
  {
    lot: "LOT-2026-0004",
    type: "packing_list",
    nom: "PL-slips.pdf",
    path: "documents/LOT-2026-0004/packing.pdf",
    metadata: {
      numeroConteneur: "OTPU6220580",
      poidsBrutKg: 560,
      poidsNetKg: 500,
      quantite: 20000,
      unite: "slips",
    },
  },
];

async function lotIdByRef(reference) {
  const { data, error } = await supabase
    .from("lots")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

let created = 0;
let updated = 0;

for (const d of DOCS) {
  const lotId = await lotIdByRef(d.lot);
  if (!lotId) {
    console.warn(`⚠︎ lot introuvable : ${d.lot} — ignoré`);
    continue;
  }

  const { data: existing, error: selErr } = await supabase
    .from("documents")
    .select("id")
    .eq("lot_id", lotId)
    .eq("type", d.type)
    .limit(1);
  if (selErr) throw selErr;

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from("documents")
      .update({
        nom_fichier: d.nom,
        storage_path: d.path,
        metadata: d.metadata,
        statut: "recu",
      })
      .eq("id", existing[0].id);
    if (error) throw error;
    updated += 1;
  } else {
    const { error } = await supabase.from("documents").insert({
      lot_id: lotId,
      type: d.type,
      nom_fichier: d.nom,
      storage_path: d.path,
      statut: "recu",
      metadata: d.metadata,
    });
    if (error) throw error;
    created += 1;
  }
}

console.log(
  `✓ Documents Gate synchronisés — ${created} créé(s), ${updated} mis à jour.`,
);
