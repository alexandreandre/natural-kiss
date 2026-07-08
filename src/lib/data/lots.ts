import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

export type LotStatut = Database["public"]["Enums"]["lot_statut"];
export type TransportMode = Database["public"]["Enums"]["transport_mode"];

export interface LotListItem {
  id: string;
  reference: string;
  numeroConteneur: string | null;
  produit: string;
  variete: string | null;
  mode: TransportMode;
  statut: LotStatut;
  destinationPort: string | null;
  destinationPays: string | null;
  scoreRisque: number | null;
  clientNom: string | null;
}

const LOT_LIST_SELECT =
  "id, reference, numero_conteneur, produit, variete, mode, statut, destination_port, destination_pays, score_risque, client:clients(nom)";

/**
 * Liste des lots (données réelles Supabase), enrichie du nom du client.
 * Accès interne via la service role (contourne la RLS).
 */
export async function listLots(limit = 20): Promise<LotListItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lots")
    .select(LOT_LIST_SELECT)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Lecture des lots impossible : ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    reference: row.reference,
    numeroConteneur: row.numero_conteneur,
    produit: row.produit,
    variete: row.variete,
    mode: row.mode,
    statut: row.statut,
    destinationPort: row.destination_port,
    destinationPays: row.destination_pays,
    scoreRisque: row.score_risque,
    clientNom: row.client?.nom ?? null,
  }));
}

/** Recherche d'un lot par n° de conteneur (utilisé dès la Brique 1). */
export async function getLotByContainer(numero: string): Promise<LotListItem | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lots")
    .select(LOT_LIST_SELECT)
    .ilike("numero_conteneur", numero.trim())
    .maybeSingle();

  if (error) throw new Error(`Recherche du lot impossible : ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    reference: data.reference,
    numeroConteneur: data.numero_conteneur,
    produit: data.produit,
    variete: data.variete,
    mode: data.mode,
    statut: data.statut,
    destinationPort: data.destination_port,
    destinationPays: data.destination_pays,
    scoreRisque: data.score_risque,
    clientNom: data.client?.nom ?? null,
  };
}
