"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type PreuveType = Database["public"]["Enums"]["preuve_type"];

const PREUVE_TYPES: PreuveType[] = ["photo_boite", "qr_chargement", "autre"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo
const ALLOWED_MIME = /^image\//;

export interface UploadResult {
  ok: boolean;
  error?: string;
}

/**
 * Capture d'une preuve de chargement (M5) : upload d'une image dans le bucket
 * `preuves`, création de la ligne `preuves_produit`, trace d'un événement
 * `loading` dans la timeline, et passage du lot au statut « chargement ».
 *
 * Par défaut, la **photo boîte** est visible du client ; le **QR de chargement**
 * reste interne. Un drapeau `visibleClient` permet de forcer la visibilité.
 */
export async function uploadPreuveAction(formData: FormData): Promise<UploadResult> {
  const lotId = String(formData.get("lotId") ?? "");
  const type = String(formData.get("type") ?? "") as PreuveType;
  const file = formData.get("file");
  const visibleOverride = formData.get("visibleClient");

  if (!lotId || !PREUVE_TYPES.includes(type)) {
    return { ok: false, error: "Type de preuve invalide." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Aucun fichier fourni." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max 10 Mo)." };
  }
  if (file.type && !ALLOWED_MIME.test(file.type)) {
    return { ok: false, error: "Seules les images sont acceptées." };
  }

  const supabase = createAdminClient();
  const { data: lot, error: lotErr } = await supabase
    .from("lots")
    .select("id, reference, mode, statut, origine_port")
    .eq("id", lotId)
    .maybeSingle();

  if (lotErr) return { ok: false, error: lotErr.message };
  if (!lot) return { ok: false, error: "Lot introuvable." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Clé d'objet SANS préfixe de bucket (cf. policy Storage + URL signée).
  const objectKey = `${lot.reference}/${type}-${Date.now()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const upload = await supabase.storage
    .from("preuves")
    .upload(objectKey, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
  if (upload.error) return { ok: false, error: upload.error.message };

  const visibleClient =
    visibleOverride === null ? type === "photo_boite" : visibleOverride === "true";

  const now = new Date().toISOString();

  const { error: insertErr } = await supabase.from("preuves_produit").insert({
    lot_id: lotId,
    type,
    storage_path: objectKey,
    prise_le: now,
    visible_client: visibleClient,
  });
  if (insertErr) return { ok: false, error: insertErr.message };

  // Trace le chargement dans la frise (idempotence non requise : chaque preuve
  // horodatée est un événement légitime).
  const label =
    type === "photo_boite"
      ? "Preuve chargement — photo boîte produit"
      : type === "qr_chargement"
        ? "Preuve chargement — scan QR"
        : "Preuve chargement";
  await supabase.from("evenements_timeline").insert({
    lot_id: lotId,
    code: "loading",
    label,
    lieu: lot.origine_port,
    mode: lot.mode,
    at: now,
  });

  // Le chargement fait avancer le lot (sans revenir en arrière sur un statut aval).
  if (lot.statut === "booking") {
    await supabase.from("lots").update({ statut: "chargement" }).eq("id", lotId);
  }

  revalidatePath("/chargement");
  revalidatePath(`/lots/${lotId}`);
  revalidatePath("/portail");
  revalidatePath(`/portail/lots/${lotId}`);
  return { ok: true };
}
