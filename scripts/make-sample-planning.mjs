// Génère le fichier Excel d'exemple du planning (Brique 5, M3).
// Usage : node scripts/make-sample-planning.mjs
// Le format imite un planning « proche du leur » : en-têtes FR, une ligne par
// départ prévu, avec une colonne « Lot » optionnelle pour rattacher le réalisé.

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ExcelJS from "exceljs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../public/exemples/planning-exemple.xlsx");

const HEADERS = [
  "Semaine",
  "Client",
  "Produit",
  "Variété",
  "Destination",
  "Quantité prévue",
  "Unité",
  "Lot",
];

// Réfère de vrais lots du seed (référence interne ou n° de conteneur) pour que
// l'import rattache le réalisé et alimente le prévu vs réalisé.
const ROWS = [
  [
    "2026-W12",
    "Georges Helfer SA",
    "Patate douce",
    "Beauregard",
    "FR",
    24,
    "t",
    "LOT-2026-0001",
  ],
  ["2026-W27", "Exo3", "Ail", "", "FR", 18, "t", "MEDU7781204"],
  [
    "2026-W30",
    "Barfoots of Botley Ltd",
    "Tenderstem / Bimi",
    "Inspiration",
    "UK",
    1200,
    "cartons",
    "",
  ],
  ["2026-W30", "Georges Helfer SA", "Patate douce", "Beauregard", "FR", 24, "t", ""],
  ["2026-W31", "Exo3", "Ail", "", "FR", 18, "t", ""],
  [
    "2026-W31",
    "Graines Voltz SAS",
    "Plants patate douce (slips)",
    "Bellevue",
    "NL",
    20000,
    "slips",
    "",
  ],
];

const wb = new ExcelJS.Workbook();
wb.creator = "Natural Kiss";
const ws = wb.addWorksheet("Planning");

ws.addRow(HEADERS);
ws.getRow(1).font = { bold: true };
for (const row of ROWS) ws.addRow(row);

ws.columns.forEach((col, i) => {
  const header = HEADERS[i] ?? "";
  const maxCell = ROWS.reduce(
    (m, r) => Math.max(m, String(r[i] ?? "").length),
    header.length,
  );
  col.width = Math.min(28, Math.max(12, maxCell + 2));
});

await mkdir(dirname(outPath), { recursive: true });
await wb.xlsx.writeFile(outPath);
console.log(`✓ Fichier d'exemple écrit : ${outPath}`);
