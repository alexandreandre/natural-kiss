// Pousse les fichiers de démo dans Supabase Storage (rejouable — upsert).
// Exécuté par `npm run seed` (et donc par `npm run db:reset`).
// Lit .env.local (URL + service role). Ignore proprement les fichiers absents.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import WS from "ws";

// Node < 22 n'expose pas globalThis.WebSocket ; supabase-js (realtime) l'exige
// dès la création du client. On fournit le polyfill via `ws`.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WS;
}

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "[seed-storage] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (.env.local).",
  );
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
// Les fichiers de démo (PDF QC) vivent à la racine du workspace, un niveau au-dessus de platform/.
const workspaceRoot = resolve(__dirname, "..", "..");

/** @type {{ bucket: string, source: string, dest: string, contentType: string }[]} */
const FILES = [
  {
    bucket: "retours-qc",
    source: "QCCheck_986640.pdf",
    dest: "QCCheck_986640.pdf",
    contentType: "application/pdf",
  },
  {
    bucket: "retours-qc",
    source: "QCCheck_995769.pdf",
    dest: "QCCheck_995769.pdf",
    contentType: "application/pdf",
  },
  {
    bucket: "retours-qc",
    source: "BR41239_CAAU4027760_SHAHD_EL_MALIKA_SWEET_POTATOES_QR.pdf",
    dest: "BR41239_CAAU4027760_QR.pdf",
    contentType: "application/pdf",
  },
];

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

let uploaded = 0;
let skipped = 0;

for (const file of FILES) {
  const abs = resolve(workspaceRoot, file.source);
  if (!existsSync(abs)) {
    console.warn(`[seed-storage] fichier absent, ignoré : ${file.source}`);
    skipped++;
    continue;
  }
  const bytes = await readFile(abs);
  const { error } = await supabase.storage
    .from(file.bucket)
    .upload(file.dest, bytes, { contentType: file.contentType, upsert: true });

  if (error) {
    console.error(
      `[seed-storage] échec ${file.bucket}/${file.dest} : ${error.message}`,
    );
    process.exitCode = 1;
  } else {
    console.log(`[seed-storage] ✓ ${file.bucket}/${file.dest}`);
    uploaded++;
  }
}

console.log(`[seed-storage] terminé — ${uploaded} envoyé(s), ${skipped} ignoré(s).`);
