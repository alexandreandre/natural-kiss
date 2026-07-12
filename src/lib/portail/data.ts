import "server-only";

import { preuveObjectKey } from "@/lib/portail/paths";
import { createServerAnonClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export { preuveObjectKey } from "@/lib/portail/paths";

type LotStatut = Database["public"]["Enums"]["lot_statut"];
type TransportMode = Database["public"]["Enums"]["transport_mode"];
type DocumentType = Database["public"]["Enums"]["document_type"];
type DocumentStatut = Database["public"]["Enums"]["document_statut"];
type QcSource = Database["public"]["Enums"]["qc_source"];
type QcVerdict = Database["public"]["Enums"]["qc_verdict"];
type EvenementCode = Database["public"]["Enums"]["evenement_code"];

const BUCKET = "preuves";
const SIGNED_URL_TTL = 60 * 60; // 1 h

export interface PortailLot {
  id: string;
  reference: string;
  numeroConteneur: string | null;
  produit: string;
  variete: string | null;
  mode: TransportMode;
  statut: LotStatut;
  originePort: string | null;
  destinationPort: string | null;
  destinationPays: string | null;
  dateDepart: string | null;
  dateArriveePrevue: string | null;
  dateArriveeReelle: string | null;
}

const LOT_SELECT =
  "id, reference, numero_conteneur, produit, variete, mode, statut, origine_port, destination_port, destination_pays, date_depart, date_arrivee_prevue, date_arrivee_reelle";

interface LotRow {
  id: string;
  reference: string;
  numero_conteneur: string | null;
  produit: string;
  variete: string | null;
  mode: TransportMode;
  statut: LotStatut;
  origine_port: string | null;
  destination_port: string | null;
  destination_pays: string | null;
  date_depart: string | null;
  date_arrivee_prevue: string | null;
  date_arrivee_reelle: string | null;
}

function mapLot(row: LotRow): PortailLot {
  return {
    id: row.id,
    reference: row.reference,
    numeroConteneur: row.numero_conteneur,
    produit: row.produit,
    variete: row.variete,
    mode: row.mode,
    statut: row.statut,
    originePort: row.origine_port,
    destinationPort: row.destination_port,
    destinationPays: row.destination_pays,
    dateDepart: row.date_depart,
    dateArriveePrevue: row.date_arrivee_prevue,
    dateArriveeReelle: row.date_arrivee_reelle,
  };
}

/** Lots du client connecté (RLS : uniquement les siens). */
export async function listMyLots(): Promise<PortailLot[]> {
  const supabase = await createServerAnonClient();
  const { data, error } = await supabase
    .from("lots")
    .select(LOT_SELECT)
    .order("date_depart", { ascending: false, nullsFirst: false })
    .order("reference", { ascending: true });

  if (error) throw new Error(`Lecture des lots impossible : ${error.message}`);
  return (data ?? []).map((r) => mapLot(r as LotRow));
}

/** Un lot du client connecté (RLS). `null` si inexistant ou non autorisé. */
export async function getMyLot(id: string): Promise<PortailLot | null> {
  const supabase = await createServerAnonClient();
  const { data, error } = await supabase
    .from("lots")
    .select(LOT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Lecture du lot impossible : ${error.message}`);
  return data ? mapLot(data as LotRow) : null;
}

export interface PortailDocument {
  id: string;
  type: DocumentType;
  nomFichier: string;
  statut: DocumentStatut;
}

export interface PortailPreuve {
  id: string;
  type: Database["public"]["Enums"]["preuve_type"];
  priseLe: string | null;
  signedUrl: string | null;
}

export interface PortailEvent {
  id: string;
  code: EvenementCode;
  label: string;
  lieu: string | null;
  at: string;
}

export interface PortailQuality {
  id: string;
  source: QcSource;
  verdict: QcVerdict;
  score: number | null;
  defauts: string[];
  recuLe: string | null;
}

export interface PortailLotDetail {
  documents: PortailDocument[];
  preuves: PortailPreuve[];
  events: PortailEvent[];
  qualite: PortailQuality[];
}

/**
 * Détail « lecture seule » d'un lot pour le portail : documents, preuves
 * visibles (photo boîte, avec URL signée), frise d'événements et retours QC.
 * L'accès est borné par la RLS ; les URLs signées sont produites via la session
 * `authenticated` → la policy Storage vérifie l'appartenance au client.
 */
export async function getMyLotDetail(lotId: string): Promise<PortailLotDetail> {
  const supabase = await createServerAnonClient();

  const [documents, preuves, events, qualite] = await Promise.all([
    supabase
      .from("documents")
      .select("id, type, nom_fichier, statut")
      .eq("lot_id", lotId)
      .order("type", { ascending: true }),
    supabase
      .from("preuves_produit")
      .select("id, type, storage_path, prise_le, visible_client")
      .eq("lot_id", lotId)
      .eq("visible_client", true)
      .order("prise_le", { ascending: true }),
    supabase
      .from("evenements_timeline")
      .select("id, code, label, lieu, at")
      .eq("lot_id", lotId)
      .order("at", { ascending: true }),
    supabase
      .from("rapports_qualite")
      .select("id, source, verdict, score, defauts, recu_le")
      .eq("lot_id", lotId)
      .order("recu_le", { ascending: false }),
  ]);

  if (documents.error)
    throw new Error(`Lecture des documents impossible : ${documents.error.message}`);
  if (preuves.error)
    throw new Error(`Lecture des preuves impossible : ${preuves.error.message}`);
  if (events.error)
    throw new Error(`Lecture de la frise impossible : ${events.error.message}`);
  if (qualite.error)
    throw new Error(`Lecture de la qualité impossible : ${qualite.error.message}`);

  const preuvesOut: PortailPreuve[] = [];
  for (const p of preuves.data ?? []) {
    let signedUrl: string | null = null;
    if (p.storage_path) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(preuveObjectKey(p.storage_path), SIGNED_URL_TTL);
      signedUrl = signed?.signedUrl ?? null;
    }
    preuvesOut.push({
      id: p.id,
      type: p.type,
      priseLe: p.prise_le,
      signedUrl,
    });
  }

  return {
    documents: (documents.data ?? []).map((d) => ({
      id: d.id,
      type: d.type,
      nomFichier: d.nom_fichier,
      statut: d.statut,
    })),
    preuves: preuvesOut,
    events: (events.data ?? []).map((e) => ({
      id: e.id,
      code: e.code,
      label: e.label,
      lieu: e.lieu,
      at: e.at,
    })),
    qualite: (qualite.data ?? []).map((q) => ({
      id: q.id,
      source: q.source,
      verdict: q.verdict,
      score: q.score,
      defauts: q.defauts ?? [],
      recuLe: q.recu_le,
    })),
  };
}

export interface PortailOnboardingDoc {
  id: string;
  type: Database["public"]["Enums"]["document_onboarding_type"];
  titre: string;
  createdAt: string;
}

/** Documents d'onboarding du client connecté (RLS : uniquement les siens). */
export async function listMyDocuments(): Promise<PortailOnboardingDoc[]> {
  const supabase = await createServerAnonClient();
  const { data, error } = await supabase
    .from("documents_onboarding")
    .select("id, type, titre, created_at")
    .order("type", { ascending: true });
  if (error) throw new Error(`Lecture des documents impossible : ${error.message}`);
  return (data ?? []).map((d) => ({
    id: d.id,
    type: d.type,
    titre: d.titre,
    createdAt: d.created_at,
  }));
}

export interface PortailOnboardingDocDetail extends PortailOnboardingDoc {
  contenuHtml: string;
}

/** Un document d'onboarding du client connecté (RLS). `null` si inaccessible. */
export async function getMyDocument(
  id: string,
): Promise<PortailOnboardingDocDetail | null> {
  const supabase = await createServerAnonClient();
  const { data, error } = await supabase
    .from("documents_onboarding")
    .select("id, type, titre, contenu_html, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Lecture du document impossible : ${error.message}`);
  return data
    ? {
        id: data.id,
        type: data.type,
        titre: data.titre,
        contenuHtml: data.contenu_html,
        createdAt: data.created_at,
      }
    : null;
}
