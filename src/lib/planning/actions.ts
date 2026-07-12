"use server";

import { revalidatePath } from "next/cache";

import { fileToMatrix } from "@/lib/planning/excel";
import { parsePlanningMatrix, type ImportError } from "@/lib/planning/parse";
import { importPlanningRows } from "@/lib/planning/service";

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_EXT = /\.(xlsx|csv)$/i;

export interface ImportPlanningResult {
  ok: boolean;
  inserted?: number;
  matchedLots?: number;
  matchedClients?: number;
  /** Lignes ignorées (diagnostic) — l'import réussit malgré tout. */
  warnings?: ImportError[];
  error?: string;
}

/**
 * Import du planning (M3) : téléverse un fichier Excel/CSV « proche du leur »,
 * en extrait les lignes de départ prévues et les insère dans `planning`.
 * Idempotent (remplace l'import précédent) et robuste (messages clairs).
 */
export async function importPlanningAction(
  formData: FormData,
): Promise<ImportPlanningResult> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Aucun fichier fourni." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max 5 Mo)." };
  }
  if (!ALLOWED_EXT.test(file.name)) {
    return {
      ok: false,
      error: "Format non supporté : joignez un fichier .xlsx ou .csv.",
    };
  }

  let matrix: string[][];
  try {
    matrix = await fileToMatrix(file);
  } catch {
    return {
      ok: false,
      error: "Fichier illisible. Vérifiez qu'il s'agit bien d'un .xlsx ou .csv valide.",
    };
  }

  const parsed = parsePlanningMatrix(matrix);
  if (parsed.rows.length === 0) {
    return {
      ok: false,
      error: parsed.errors[0]?.message ?? "Aucune ligne de planning exploitable.",
      warnings: parsed.errors,
    };
  }

  try {
    const outcome = await importPlanningRows(parsed.rows);
    revalidatePath("/planning");
    revalidatePath("/dashboard");
    return {
      ok: true,
      inserted: outcome.inserted,
      matchedLots: outcome.matchedLots,
      matchedClients: outcome.matchedClients,
      warnings: parsed.errors,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import impossible." };
  }
}
