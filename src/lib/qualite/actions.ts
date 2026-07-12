"use server";

import { revalidatePath } from "next/cache";

import { importEmailQC, type ImportQcResult } from "@/lib/qualite/service";

/**
 * Importe un mail de retour qualité (PDF → rattachement lot → analyse IA) puis
 * rafraîchit le hub, les tendances et la fiche du lot rattaché.
 */
export async function importEmailQCAction(emailId: string): Promise<ImportQcResult> {
  const result = await importEmailQC(emailId);
  revalidatePath("/qualite");
  if (result.lotId) revalidatePath(`/lots/${result.lotId}`);
  return result;
}
