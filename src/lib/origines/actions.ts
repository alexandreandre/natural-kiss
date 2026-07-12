"use server";

import { revalidatePath } from "next/cache";

import { syncLotOrigin } from "@/lib/origines/service";

/** Relance le connecteur Cropwise (mock) pour un lot, puis rafraîchit la fiche. */
export async function syncOriginAction(lotId: string): Promise<void> {
  await syncLotOrigin(lotId);
  revalidatePath(`/lots/${lotId}`);
}
