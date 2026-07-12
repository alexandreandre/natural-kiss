"use server";

import { revalidatePath } from "next/cache";

import {
  createLitige,
  issueCertificatDestruction,
  updateLitigeStatut,
  upsertPaiement,
  type CreateLitigeInput,
  type IssueCertificatInput,
  type UpsertPaiementInput,
} from "@/lib/finance/service";
import type { LitigeStatut } from "@/lib/finance/rules";

function refresh(lotId: string): void {
  revalidatePath(`/lots/${lotId}`);
  revalidatePath("/finance");
}

export async function upsertPaiementAction(
  lotId: string,
  input: UpsertPaiementInput,
): Promise<void> {
  await upsertPaiement(lotId, input);
  refresh(lotId);
}

export async function createLitigeAction(
  lotId: string,
  input: CreateLitigeInput,
): Promise<void> {
  await createLitige(lotId, input);
  refresh(lotId);
}

export async function updateLitigeStatutAction(
  lotId: string,
  litigeId: string,
  statut: LitigeStatut,
  resolution?: string | null,
): Promise<void> {
  await updateLitigeStatut(litigeId, statut, resolution);
  refresh(lotId);
}

export async function issueCertificatDestructionAction(
  lotId: string,
  input: IssueCertificatInput,
): Promise<void> {
  await issueCertificatDestruction(lotId, input);
  refresh(lotId);
}
