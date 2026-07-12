import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  computeFactureCoherence,
  effectivePaymentStatus,
  type FactureCoherence,
  type LitigeStatut,
  type PaiementStatut,
} from "@/lib/finance/rules";

type LitigeType = Database["public"]["Enums"]["litige_type"];

export interface FinanceOverviewRow {
  lotId: string;
  reference: string;
  produit: string;
  clientNom: string | null;
  paiementStatut: PaiementStatut;
  montant: number | null;
  devise: string;
  litigesOuverts: number;
  factureCoherence: FactureCoherence;
}

/** Liste des lots avec leur situation financière (page d'aperçu /finance). */
export async function listFinanceOverview(): Promise<FinanceOverviewRow[]> {
  const supabase = createAdminClient();

  const [lots, paiements, litiges, anomalies, conformite] = await Promise.all([
    supabase
      .from("lots")
      .select("id, reference, produit, client:clients(nom)")
      .order("reference", { ascending: true }),
    supabase.from("paiements").select("lot_id, statut, montant, devise"),
    supabase.from("litiges").select("lot_id, statut"),
    supabase.from("anomalies_documentaires").select("lot_id, valeurs"),
    supabase.from("conformite_checks").select("lot_id"),
  ]);

  if (lots.error)
    throw new Error(`Lecture des lots impossible : ${lots.error.message}`);
  if (paiements.error)
    throw new Error(`Lecture des paiements impossible : ${paiements.error.message}`);
  if (litiges.error)
    throw new Error(`Lecture des litiges impossible : ${litiges.error.message}`);
  if (anomalies.error)
    throw new Error(`Lecture des anomalies impossible : ${anomalies.error.message}`);
  if (conformite.error)
    throw new Error(
      `Lecture de la conformité impossible : ${conformite.error.message}`,
    );

  const paiementByLot = new Map(
    (paiements.data ?? []).map((p) => [
      p.lot_id,
      { statut: p.statut as PaiementStatut, montant: p.montant, devise: p.devise },
    ]),
  );
  const litigesByLot = new Map<string, LitigeStatut[]>();
  for (const l of litiges.data ?? []) {
    const arr = litigesByLot.get(l.lot_id) ?? [];
    arr.push(l.statut as LitigeStatut);
    litigesByLot.set(l.lot_id, arr);
  }
  const anomaliesByLot = new Map<
    string,
    { valeurs: { sources?: string[] | null } }[]
  >();
  for (const a of anomalies.data ?? []) {
    const arr = anomaliesByLot.get(a.lot_id) ?? [];
    arr.push({ valeurs: (a.valeurs ?? {}) as { sources?: string[] | null } });
    anomaliesByLot.set(a.lot_id, arr);
  }
  const gateRanLots = new Set((conformite.data ?? []).map((c) => c.lot_id));

  return (lots.data ?? []).map((l) => {
    const paiement = paiementByLot.get(l.id) ?? {
      statut: "a_venir" as PaiementStatut,
      montant: null,
      devise: "EUR",
    };
    const litigesStatuts = (litigesByLot.get(l.id) ?? []).map((statut) => ({ statut }));
    return {
      lotId: l.id,
      reference: l.reference,
      produit: l.produit,
      clientNom: l.client?.nom ?? null,
      paiementStatut: effectivePaymentStatus(paiement.statut, litigesStatuts),
      montant: paiement.montant,
      devise: paiement.devise,
      litigesOuverts: litigesStatuts.filter(
        (l) => l.statut === "ouvert" || l.statut === "en_cours",
      ).length,
      factureCoherence: computeFactureCoherence(
        (anomaliesByLot.get(l.id) ?? []).map((a) => ({
          valeurs: { sources: a.valeurs.sources ?? [] },
        })),
        gateRanLots.has(l.id),
      ),
    };
  });
}

export interface LitigeRow {
  id: string;
  type: LitigeType;
  statut: LitigeStatut;
  montantConteste: number | null;
  devise: string;
  description: string;
  resolution: string | null;
  ouvertLe: string;
  resoluLe: string | null;
}

export interface CertificatDestructionRow {
  id: string;
  motif: string;
  quantite: number | null;
  unite: string | null;
  emisLe: string;
}

export interface LotFinanceData {
  paiement: {
    statut: PaiementStatut;
    montant: number | null;
    devise: string;
    echeance: string | null;
    payeLe: string | null;
    notes: string | null;
  };
  litiges: LitigeRow[];
  certificatsDestruction: CertificatDestructionRow[];
  factureCoherence: FactureCoherence;
}

/** Situation financière détaillée d'un lot (onglet Finance de la fiche lot). */
export async function getLotFinance(lotId: string): Promise<LotFinanceData> {
  const supabase = createAdminClient();

  const [paiement, litiges, certificats, anomalies, conformite] = await Promise.all([
    supabase
      .from("paiements")
      .select("statut, montant, devise, echeance, paye_le, notes")
      .eq("lot_id", lotId)
      .maybeSingle(),
    supabase
      .from("litiges")
      .select(
        "id, type, statut, montant_conteste, devise, description, resolution, ouvert_le, resolu_le",
      )
      .eq("lot_id", lotId)
      .order("ouvert_le", { ascending: false }),
    supabase
      .from("certificats_destruction")
      .select("id, motif, quantite, unite, emis_le")
      .eq("lot_id", lotId)
      .order("emis_le", { ascending: false }),
    supabase.from("anomalies_documentaires").select("valeurs").eq("lot_id", lotId),
    supabase
      .from("conformite_checks")
      .select("id", { count: "exact", head: true })
      .eq("lot_id", lotId),
  ]);

  if (paiement.error)
    throw new Error(`Lecture du paiement impossible : ${paiement.error.message}`);
  if (litiges.error)
    throw new Error(`Lecture des litiges impossible : ${litiges.error.message}`);
  if (certificats.error)
    throw new Error(
      `Lecture des certificats impossible : ${certificats.error.message}`,
    );
  if (anomalies.error)
    throw new Error(`Lecture des anomalies impossible : ${anomalies.error.message}`);
  if (conformite.error)
    throw new Error(
      `Lecture de la conformité impossible : ${conformite.error.message}`,
    );

  const litigesRows: LitigeRow[] = (litiges.data ?? []).map((l) => ({
    id: l.id,
    type: l.type,
    statut: l.statut as LitigeStatut,
    montantConteste: l.montant_conteste,
    devise: l.devise,
    description: l.description,
    resolution: l.resolution,
    ouvertLe: l.ouvert_le,
    resoluLe: l.resolu_le,
  }));

  return {
    paiement: {
      statut: effectivePaymentStatus(
        (paiement.data?.statut as PaiementStatut) ?? "a_venir",
        litigesRows,
      ),
      montant: paiement.data?.montant ?? null,
      devise: paiement.data?.devise ?? "EUR",
      echeance: paiement.data?.echeance ?? null,
      payeLe: paiement.data?.paye_le ?? null,
      notes: paiement.data?.notes ?? null,
    },
    litiges: litigesRows,
    certificatsDestruction: (certificats.data ?? []).map((c) => ({
      id: c.id,
      motif: c.motif,
      quantite: c.quantite,
      unite: c.unite,
      emisLe: c.emis_le,
    })),
    factureCoherence: computeFactureCoherence(
      (anomalies.data ?? []).map((a) => ({
        valeurs: {
          sources: (a.valeurs as { sources?: string[] } | null)?.sources ?? [],
        },
      })),
      (conformite.count ?? 0) > 0,
    ),
  };
}

export interface UpsertPaiementInput {
  statut: PaiementStatut;
  montant?: number | null;
  echeance?: string | null;
  payeLe?: string | null;
  notes?: string | null;
}

/** Met à jour (ou crée) le statut de paiement d'un lot. */
export async function upsertPaiement(
  lotId: string,
  input: UpsertPaiementInput,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("paiements").upsert(
    {
      lot_id: lotId,
      statut: input.statut,
      montant: input.montant ?? null,
      echeance: input.echeance ?? null,
      paye_le: input.payeLe ?? null,
      notes: input.notes ?? null,
    },
    { onConflict: "lot_id" },
  );
  if (error) throw new Error(`Écriture du paiement impossible : ${error.message}`);
}

export interface CreateLitigeInput {
  type: LitigeType;
  description: string;
  montantConteste?: number | null;
}

/** Ouvre un litige sur un lot (cas type Voltz : facture contestée). */
export async function createLitige(
  lotId: string,
  input: CreateLitigeInput,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("litiges").insert({
    lot_id: lotId,
    type: input.type,
    description: input.description,
    montant_conteste: input.montantConteste ?? null,
  });
  if (error) throw new Error(`Écriture du litige impossible : ${error.message}`);
}

/** Fait évoluer le statut d'un litige (ex : résolution après accord client). */
export async function updateLitigeStatut(
  litigeId: string,
  statut: LitigeStatut,
  resolution?: string | null,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("litiges")
    .update({
      statut,
      resolution: resolution ?? null,
      resolu_le:
        statut === "resolu" || statut === "clos"
          ? new Date().toISOString().slice(0, 10)
          : null,
    })
    .eq("id", litigeId);
  if (error) throw new Error(`Mise à jour du litige impossible : ${error.message}`);
}

export interface IssueCertificatInput {
  motif: string;
  quantite?: number | null;
  unite?: string | null;
}

/** Émet un certificat de destruction pour un lot rejeté/détruit. */
export async function issueCertificatDestruction(
  lotId: string,
  input: IssueCertificatInput,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("certificats_destruction").insert({
    lot_id: lotId,
    motif: input.motif,
    quantite: input.quantite ?? null,
    unite: input.unite ?? null,
  });
  if (error) throw new Error(`Émission du certificat impossible : ${error.message}`);
}
