/**
 * Parsing du planning importé — **pur et testé** (Brique 5, M3).
 *
 * Entrée : une **matrice de cellules** (`string[][]`) déjà extraite du fichier
 * (Excel ou CSV) — la lecture binaire est isolée dans `excel.ts`, ce module
 * reste pur pour être testé sans fichier.
 *
 * Robustesse (Definition of Done) : en-têtes tolérants (accents/casse/alias),
 * détection de la ligne d'en-tête, et **messages clairs** quand une colonne
 * obligatoire manque ou qu'une cellule est invalide.
 */

import { parseSemaine } from "@/lib/planning/week";

export type PlanningField =
  | "semaine"
  | "client"
  | "produit"
  | "variete"
  | "destination"
  | "port"
  | "quantite"
  | "unite"
  | "lot";

/** Alias d'en-tête acceptés (après normalisation) par champ. */
const HEADER_ALIASES: Record<PlanningField, string[]> = {
  semaine: ["semaine", "sem", "week", "wk", "semaineiso", "semaine de depart"],
  client: ["client", "customer", "destinataire", "clientnom"],
  produit: ["produit", "product", "article", "designation", "marchandise"],
  variete: ["variete", "variety", "var"],
  destination: [
    "destination",
    "pays",
    "country",
    "paysdestination",
    "destinationpays",
    "pays de destination",
  ],
  port: ["port", "portdestination", "destinationport", "lieu", "port de destination"],
  quantite: [
    "quantite",
    "quantiteprevue",
    "quantite prevue",
    "qte",
    "quantity",
    "volume",
    "prevu",
    "quantite prevu",
  ],
  unite: ["unite", "unit", "uom", "u"],
  lot: [
    "lot",
    "lotrealise",
    "lot realise",
    "reference",
    "reflot",
    "ref lot",
    "numerolot",
    "conteneur",
    "container",
  ],
};

const REQUIRED_FIELDS: PlanningField[] = ["semaine", "produit"];

export interface ParsedPlanningRow {
  semaineIso: string;
  semaineDebut: string;
  clientNom: string | null;
  produit: string;
  variete: string | null;
  destinationPays: string | null;
  destinationPort: string | null;
  quantitePrevue: number | null;
  unite: string | null;
  /** Référence du lot réalisé à rattacher (résolue en `lot_id` côté service). */
  lotReference: string | null;
}

export interface ImportError {
  /** Ligne 1-indexée dans le fichier (en-tête compris), ou 0 pour une erreur globale. */
  row: number;
  message: string;
}

export interface ParseResult {
  rows: ParsedPlanningRow[];
  errors: ImportError[];
  /** Mapping champ → index de colonne détecté (diagnostic). */
  columns: Partial<Record<PlanningField, number>>;
}

/** Normalise une chaîne : minuscules, sans accents, alphanumérique compacté. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cell(row: string[] | undefined, index: number | undefined): string {
  if (row === undefined || index === undefined) return "";
  return (row[index] ?? "").toString().trim();
}

/** Nombre depuis une cellule (« 1 200 » / « 1,5 » / « 2.5 t » → 1200 / 1.5 / 2.5). */
export function parseNumber(raw: string): number | null {
  const cleaned = raw
    .replace(/[\s\u00a0]/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "") // séparateur de milliers « . »
    .replace(",", ".");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Détecte la ligne d'en-tête (celle qui contient les colonnes obligatoires). */
function detectHeader(
  matrix: string[][],
): { index: number; columns: Partial<Record<PlanningField, number>> } | null {
  const limit = Math.min(matrix.length, 10);
  for (let r = 0; r < limit; r += 1) {
    const columns = mapHeader(matrix[r]);
    if (REQUIRED_FIELDS.every((f) => columns[f] !== undefined)) {
      return { index: r, columns };
    }
  }
  return null;
}

function mapHeader(row: string[]): Partial<Record<PlanningField, number>> {
  const columns: Partial<Record<PlanningField, number>> = {};
  row.forEach((raw, col) => {
    const norm = normalize(String(raw ?? ""));
    if (!norm) return;
    for (const field of Object.keys(HEADER_ALIASES) as PlanningField[]) {
      if (columns[field] !== undefined) continue;
      if (HEADER_ALIASES[field].some((alias) => normalize(alias) === norm)) {
        columns[field] = col;
        return;
      }
    }
  });
  return columns;
}

/**
 * Parse une matrice de cellules en lignes de planning + erreurs.
 * `fallbackYear` sert quand la semaine est fournie sans année (« W12 »).
 */
export function parsePlanningMatrix(
  matrix: string[][],
  fallbackYear: number = new Date().getUTCFullYear(),
): ParseResult {
  const nonEmpty = matrix.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (nonEmpty.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "Fichier vide." }], columns: {} };
  }

  const header = detectHeader(matrix);
  if (!header) {
    const missing = REQUIRED_FIELDS.join(", ");
    return {
      rows: [],
      errors: [
        {
          row: 0,
          message: `Colonnes obligatoires introuvables (${missing}). Vérifiez l'en-tête du fichier.`,
        },
      ],
      columns: {},
    };
  }

  const { index: headerIndex, columns } = header;
  const rows: ParsedPlanningRow[] = [];
  const errors: ImportError[] = [];

  for (let r = headerIndex + 1; r < matrix.length; r += 1) {
    const raw = matrix[r];
    const fileRow = r + 1; // 1-indexé pour l'utilisateur
    if (!raw || raw.every((c) => String(c ?? "").trim() === "")) continue;

    const semaineRaw = cell(raw, columns.semaine);
    const produit = cell(raw, columns.produit);

    if (!produit) {
      errors.push({ row: fileRow, message: "Produit manquant." });
      continue;
    }
    const semaine = parseSemaine(semaineRaw, fallbackYear);
    if (!semaine) {
      errors.push({
        row: fileRow,
        message: `Semaine invalide (« ${semaineRaw || "vide"} »).`,
      });
      continue;
    }

    const quantiteRaw = cell(raw, columns.quantite);
    const clientNom = cell(raw, columns.client);
    const variete = cell(raw, columns.variete);
    const destinationPays = cell(raw, columns.destination);
    const destinationPort = cell(raw, columns.port);
    const unite = cell(raw, columns.unite);
    const lotReference = cell(raw, columns.lot);

    rows.push({
      semaineIso: semaine.iso,
      semaineDebut: semaine.monday,
      clientNom: clientNom || null,
      produit,
      variete: variete || null,
      destinationPays: destinationPays || null,
      destinationPort: destinationPort || null,
      quantitePrevue: quantiteRaw ? parseNumber(quantiteRaw) : null,
      unite: unite || null,
      lotReference: lotReference || null,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push({
      row: 0,
      message: "Aucune ligne de planning trouvée sous l'en-tête.",
    });
  }

  return { rows, errors, columns };
}
