"use server";

import { revalidatePath } from "next/cache";

import { runGateCheck } from "@/lib/gate/service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type DocumentTypeValue = Database["public"]["Enums"]["document_type"];

const DOC_TYPES: DocumentTypeValue[] = [
  "facture",
  "bl",
  "phyto",
  "packing_list",
  "certificat_origine",
  "ched_pp",
  "autre",
];

/** Relance la vérification IA + la Gate pour un lot, puis rafraîchit les vues. */
export async function runGateCheckAction(lotId: string): Promise<void> {
  await runGateCheck(lotId);
  revalidatePath(`/lots/${lotId}`);
  revalidatePath("/gate");
}

export interface UploadResult {
  ok: boolean;
  error?: string;
}

/**
 * Dépôt d'un document et rattachement au lot (upload Storage + ligne `documents`).
 * Les métadonnées du n° conteneur sont pré-remplies depuis le lot (démo mock).
 */
export async function uploadDocumentAction(formData: FormData): Promise<UploadResult> {
  const lotId = String(formData.get("lotId") ?? "");
  const type = String(formData.get("type") ?? "") as DocumentTypeValue;
  const file = formData.get("file");

  if (!lotId || !DOC_TYPES.includes(type)) {
    return { ok: false, error: "Type de document invalide." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Aucun fichier fourni." };
  }

  const supabase = createAdminClient();
  const { data: lot } = await supabase
    .from("lots")
    .select("reference, numero_conteneur")
    .eq("id", lotId)
    .maybeSingle();

  const ref = lot?.reference ?? lotId;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${ref}/${type}-${Date.now()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const upload = await supabase.storage.from("documents").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (upload.error) return { ok: false, error: upload.error.message };

  const { error } = await supabase.from("documents").insert({
    lot_id: lotId,
    type,
    nom_fichier: file.name,
    storage_path: path,
    metadata: lot?.numero_conteneur ? { numeroConteneur: lot.numero_conteneur } : {},
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/lots/${lotId}`);
  return { ok: true };
}
