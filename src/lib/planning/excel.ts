import "server-only";

import ExcelJS from "exceljs";

/**
 * Lecture binaire d'un fichier de planning → **matrice de cellules** (`string[][]`).
 * Isolé du parsing métier (`parse.ts` reste pur & testé). Gère `.xlsx` (via
 * exceljs) et `.csv` (parseur minimal, séparateur `,` ou `;`).
 */

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const v = value as {
      text?: unknown;
      result?: unknown;
      richText?: { text?: string }[];
      hyperlink?: string;
    };
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text ?? "").join("");
    if (v.text !== undefined) return String(v.text);
    if (v.result !== undefined) return String(v.result);
    if (v.hyperlink !== undefined) return String(v.hyperlink);
    return "";
  }
  return String(value);
}

async function xlsxToMatrix(buffer: ArrayBuffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const matrix: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    // `row.values` est 1-indexé (l'index 0 est vide) → on retire la première case.
    const values = (row.values as unknown[]) ?? [];
    matrix.push(values.slice(1).map(cellToString));
  });
  return matrix;
}

/** Découpe une ligne CSV en respectant les guillemets. */
function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

function csvToMatrix(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const header = lines[0] ?? "";
  // Séparateur : « ; » s'il domine dans l'en-tête (locale FR fréquente), sinon « , ».
  const delimiter =
    (header.match(/;/g)?.length ?? 0) > (header.match(/,/g)?.length ?? 0) ? ";" : ",";
  return lines.filter((l) => l.trim() !== "").map((l) => splitCsvLine(l, delimiter));
}

/** Convertit un fichier téléversé en matrice de cellules. */
export async function fileToMatrix(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  const isCsv = name.endsWith(".csv") || file.type === "text/csv";
  if (isCsv) {
    return csvToMatrix(await file.text());
  }
  return xlsxToMatrix(await file.arrayBuffer());
}
