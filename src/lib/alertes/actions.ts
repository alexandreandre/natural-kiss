"use server";

import { revalidatePath } from "next/cache";

import { runAlertScan, runAlertScanAll } from "@/lib/alertes/service";

/** Relance le moteur d'alertes pour un lot, puis rafraîchit les vues. */
export async function runAlertScanAction(lotId: string): Promise<void> {
  await runAlertScan(lotId);
  revalidatePath(`/lots/${lotId}`);
  revalidatePath("/alertes");
}

/** Relance le moteur d'alertes sur tous les lots actifs. */
export async function runAlertScanAllAction(): Promise<void> {
  await runAlertScanAll();
  revalidatePath("/alertes");
}
