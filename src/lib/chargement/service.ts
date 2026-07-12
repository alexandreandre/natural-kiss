import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { preuveObjectKey } from "@/lib/portail/paths";

type PreuveType = Database["public"]["Enums"]["preuve_type"];
type LotStatut = Database["public"]["Enums"]["lot_statut"];

const BUCKET = "preuves";
const SIGNED_URL_TTL = 60 * 60;

export interface PreuveItem {
  id: string;
  type: PreuveType;
  nomFichier: string;
  priseLe: string | null;
  visibleClient: boolean;
  signedUrl: string | null;
}

/**
 * Preuves produit d'un lot (vue interne, service role) avec URL signée pour la
 * prévisualisation. Contrairement au portail, l'interne voit TOUTES les preuves
 * (photo boîte visible client + QR de chargement interne).
 */
export async function getPreuves(lotId: string): Promise<PreuveItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("preuves_produit")
    .select("id, type, storage_path, prise_le, visible_client")
    .eq("lot_id", lotId)
    .order("prise_le", { ascending: true });

  if (error) throw new Error(`Lecture des preuves impossible : ${error.message}`);

  const out: PreuveItem[] = [];
  for (const p of data ?? []) {
    let signedUrl: string | null = null;
    if (p.storage_path) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(preuveObjectKey(p.storage_path), SIGNED_URL_TTL);
      signedUrl = signed?.signedUrl ?? null;
    }
    out.push({
      id: p.id,
      type: p.type,
      nomFichier: preuveObjectKey(p.storage_path ?? "").split("/").pop() ?? "—",
      priseLe: p.prise_le,
      visibleClient: p.visible_client,
      signedUrl,
    });
  }
  return out;
}

export interface ChargementOverviewRow {
  lotId: string;
  reference: string;
  numeroConteneur: string | null;
  produit: string;
  clientNom: string | null;
  statut: LotStatut;
  preuvesCount: number;
  photoBoite: boolean;
}

/**
 * Vue d'ensemble du chargement (page /chargement) : chaque lot avec le nombre
 * de preuves déjà capturées et si une photo boîte (visible client) existe.
 */
export async function listChargementOverview(): Promise<ChargementOverviewRow[]> {
  const supabase = createAdminClient();

  const [lots, preuves] = await Promise.all([
    supabase
      .from("lots")
      .select("id, reference, numero_conteneur, produit, statut, client:clients(nom)")
      .order("date_booking", { ascending: false, nullsFirst: false })
      .order("reference", { ascending: true }),
    supabase.from("preuves_produit").select("lot_id, type, visible_client"),
  ]);

  if (lots.error) throw new Error(`Lecture des lots impossible : ${lots.error.message}`);
  if (preuves.error)
    throw new Error(`Lecture des preuves impossible : ${preuves.error.message}`);

  const byLot = new Map<string, { count: number; photo: boolean }>();
  for (const p of preuves.data ?? []) {
    const cur = byLot.get(p.lot_id) ?? { count: 0, photo: false };
    cur.count += 1;
    if (p.type === "photo_boite" && p.visible_client) cur.photo = true;
    byLot.set(p.lot_id, cur);
  }

  return (lots.data ?? []).map((l) => {
    const agg = byLot.get(l.id) ?? { count: 0, photo: false };
    return {
      lotId: l.id,
      reference: l.reference,
      numeroConteneur: l.numero_conteneur,
      produit: l.produit,
      clientNom: l.client?.nom ?? null,
      statut: l.statut,
      preuvesCount: agg.count,
      photoBoite: agg.photo,
    };
  });
}
