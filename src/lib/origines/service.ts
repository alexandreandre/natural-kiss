import "server-only";

import { getFieldTraceProvider } from "@/lib/adapters";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * M0b — Connecteur Cropwise (mock) : rattache un lot à son origine champ
 * (parcelle/récolte) via `FieldTraceProvider`, et la persiste dans `origines`.
 * Idempotent : upsert sur (lot_id, ref) — un re-sync met à jour la même ligne.
 */
export async function syncLotOrigin(lotId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: lot, error: lotErr } = await supabase
    .from("lots")
    .select("id, reference, numero_conteneur")
    .eq("id", lotId)
    .maybeSingle();
  if (lotErr) throw new Error(`Lecture du lot impossible : ${lotErr.message}`);
  if (!lot) throw new Error(`Lot introuvable : ${lotId}`);

  const ref = lot.numero_conteneur ?? lot.reference;
  const trace = await getFieldTraceProvider().getTrace(ref);
  if (!trace) return;

  const { error } = await supabase.from("origines").upsert(
    {
      lot_id: lotId,
      ref: trace.ref,
      site: trace.site,
      parcelle: trace.parcelle,
      variete: trace.variete,
      date_recolte: trace.dateRecolte,
      traitements: trace.traitements,
    },
    { onConflict: "lot_id,ref" },
  );
  if (error) throw new Error(`Écriture de l'origine impossible : ${error.message}`);
}

export interface SiteOverviewRow {
  site: string;
  lots: {
    lotId: string;
    reference: string;
    produit: string;
    parcelle: string | null;
  }[];
}

/** Vue multi-sites (M0b) : lots regroupés par site de production. */
export async function listOriginesBySite(): Promise<SiteOverviewRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("origines")
    .select("site, parcelle, lot:lots(id, reference, produit)")
    .order("site", { ascending: true });
  if (error) throw new Error(`Lecture des origines impossible : ${error.message}`);

  const bySite = new Map<string, SiteOverviewRow["lots"]>();
  for (const row of data ?? []) {
    const lot = row.lot as { id: string; reference: string; produit: string } | null;
    if (!lot) continue;
    const list = bySite.get(row.site) ?? [];
    if (!list.some((l) => l.lotId === lot.id)) {
      list.push({
        lotId: lot.id,
        reference: lot.reference,
        produit: lot.produit,
        parcelle: row.parcelle,
      });
    }
    bySite.set(row.site, list);
  }

  return [...bySite.entries()]
    .map(([site, lots]) => ({ site, lots }))
    .sort((a, b) => a.site.localeCompare(b.site));
}
