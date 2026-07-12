import { qcAnalysisSchema, type QcAnalysis } from "@/lib/adapters/types";
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
  dateDepart: string | null;
  dateArriveePrevue: string | null;
  dateArriveeReelle: string | null;
  scoreRisque: number | null;
  clientNom: string | null;
}

const LOT_LIST_SELECT =
  "id, reference, numero_conteneur, produit, variete, mode, statut, destination_port, destination_pays, date_depart, date_arrivee_prevue, date_arrivee_reelle, score_risque, client:clients(nom)";

interface LotListRow {
  id: string;
  reference: string;
  numero_conteneur: string | null;
  produit: string;
  variete: string | null;
  mode: TransportMode;
  statut: LotStatut;
  destination_port: string | null;
  destination_pays: string | null;
  date_depart: string | null;
  date_arrivee_prevue: string | null;
  date_arrivee_reelle: string | null;
  score_risque: number | null;
  client?: { nom: string } | null;
}

function mapListRow(row: LotListRow): LotListItem {
  return {
    id: row.id,
    reference: row.reference,
    numeroConteneur: row.numero_conteneur,
    produit: row.produit,
    variete: row.variete,
    mode: row.mode,
    statut: row.statut,
    destinationPort: row.destination_port,
    destinationPays: row.destination_pays,
    dateDepart: row.date_depart,
    dateArriveePrevue: row.date_arrivee_prevue,
    dateArriveeReelle: row.date_arrivee_reelle,
    scoreRisque: row.score_risque,
    clientNom: row.client?.nom ?? null,
  };
}

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

  return (data ?? []).map(mapListRow);
}

export type DocumentType = Database["public"]["Enums"]["document_type"];
export type DocumentStatut = Database["public"]["Enums"]["document_statut"];
export type QcSource = Database["public"]["Enums"]["qc_source"];
export type QcVerdict = Database["public"]["Enums"]["qc_verdict"];

/** Filtres de base de la liste des lots (Brique 2). */
export interface LotFilters {
  clientId?: string;
  produit?: string;
  pays?: string;
  statut?: LotStatut;
}

/**
 * Liste filtrable des lots (Brique 2). Filtres de base : client, produit, pays,
 * statut. Triée par score de risque décroissant (les lots à surveiller d'abord),
 * puis par référence pour un ordre déterministe.
 */
export async function listLotsFiltered(
  filters: LotFilters = {},
  limit = 100,
): Promise<LotListItem[]> {
  const supabase = createAdminClient();
  let query = supabase.from("lots").select(LOT_LIST_SELECT);

  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.produit) query = query.eq("produit", filters.produit);
  if (filters.pays) query = query.eq("destination_pays", filters.pays);
  if (filters.statut) query = query.eq("statut", filters.statut);

  const { data, error } = await query
    .order("score_risque", { ascending: false, nullsFirst: false })
    .order("reference", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Lecture des lots impossible : ${error.message}`);
  return (data ?? []).map(mapListRow);
}

/** Options disponibles pour les filtres (dérivées des lots existants). */
export interface LotFilterOptions {
  clients: { id: string; nom: string }[];
  produits: string[];
  pays: string[];
  statuts: LotStatut[];
}

export async function getLotFilterOptions(): Promise<LotFilterOptions> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lots")
    .select("produit, destination_pays, statut, client:clients(id, nom)");

  if (error) {
    throw new Error(`Lecture des options de filtre impossible : ${error.message}`);
  }

  const clients = new Map<string, string>();
  const produits = new Set<string>();
  const pays = new Set<string>();
  const statuts = new Set<LotStatut>();

  for (const row of data ?? []) {
    if (row.client?.id && row.client?.nom) clients.set(row.client.id, row.client.nom);
    if (row.produit) produits.add(row.produit);
    if (row.destination_pays) pays.add(row.destination_pays);
    if (row.statut) statuts.add(row.statut);
  }

  return {
    clients: [...clients.entries()]
      .map(([id, nom]) => ({ id, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom)),
    produits: [...produits].sort((a, b) => a.localeCompare(b)),
    pays: [...pays].sort((a, b) => a.localeCompare(b)),
    statuts: [...statuts],
  };
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

  return mapListRow(data);
}

export interface LotTracking extends LotListItem {
  variete: string | null;
  originePort: string | null;
  temperatureConsigneC: number | null;
  dateBooking: string | null;
  dateDepart: string | null;
  dateArriveePrevue: string | null;
  dateArriveeReelle: string | null;
  transporteurNom: string | null;
  /** Date de récolte la plus ancienne (traçabilité champ), si connue. */
  harvestDate: string | null;
  notes: string | null;
}

const LOT_TRACKING_SELECT =
  "id, reference, numero_conteneur, produit, variete, mode, statut, origine_port, destination_port, destination_pays, temperature_consigne_c, date_booking, date_depart, date_arrivee_prevue, date_arrivee_reelle, score_risque, notes, client:clients(nom), transporteur:transporteurs(nom), origines(date_recolte)";

/**
 * Résout un lot pour la page de suivi (Brique 1) à partir d'un **numéro**
 * (conteneur, booking ou référence de lot interne — les trois sont acceptés).
 * Recherche insensible à la casse, enrichie du client, du transporteur et de
 * la date de récolte (pour le calcul du score de risque).
 */
export async function getLotForTracking(query: string): Promise<LotTracking | null> {
  const q = query.trim();
  if (!q) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lots")
    .select(LOT_TRACKING_SELECT)
    .or(`numero_conteneur.ilike.${q},reference.ilike.${q}`)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Recherche du lot impossible : ${error.message}`);
  if (!data) return null;

  const harvestDates = (data.origines ?? [])
    .map((o) => o.date_recolte)
    .filter((d): d is string => Boolean(d))
    .sort();

  return {
    id: data.id,
    reference: data.reference,
    numeroConteneur: data.numero_conteneur,
    produit: data.produit,
    variete: data.variete,
    mode: data.mode,
    statut: data.statut,
    originePort: data.origine_port,
    destinationPort: data.destination_port,
    destinationPays: data.destination_pays,
    temperatureConsigneC: data.temperature_consigne_c,
    dateBooking: data.date_booking,
    dateDepart: data.date_depart,
    dateArriveePrevue: data.date_arrivee_prevue,
    dateArriveeReelle: data.date_arrivee_reelle,
    scoreRisque: data.score_risque,
    clientNom: data.client?.nom ?? null,
    transporteurNom: data.transporteur?.nom ?? null,
    harvestDate: harvestDates[0] ?? null,
    notes: data.notes,
  };
}

/**
 * Charge un lot par son identifiant, avec les mêmes champs enrichis que le
 * suivi (client, transporteur, récolte). Base de l'en-tête de la fiche 360°.
 */
export async function getLotById(id: string): Promise<LotTracking | null> {
  const q = id.trim();
  if (!q) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lots")
    .select(LOT_TRACKING_SELECT)
    .eq("id", q)
    .maybeSingle();

  if (error) throw new Error(`Lecture du lot impossible : ${error.message}`);
  if (!data) return null;

  const harvestDates = (data.origines ?? [])
    .map((o) => o.date_recolte)
    .filter((d): d is string => Boolean(d))
    .sort();

  return {
    id: data.id,
    reference: data.reference,
    numeroConteneur: data.numero_conteneur,
    produit: data.produit,
    variete: data.variete,
    mode: data.mode,
    statut: data.statut,
    originePort: data.origine_port,
    destinationPort: data.destination_port,
    destinationPays: data.destination_pays,
    temperatureConsigneC: data.temperature_consigne_c,
    dateBooking: data.date_booking,
    dateDepart: data.date_depart,
    dateArriveePrevue: data.date_arrivee_prevue,
    dateArriveeReelle: data.date_arrivee_reelle,
    scoreRisque: data.score_risque,
    clientNom: data.client?.nom ?? null,
    transporteurNom: data.transporteur?.nom ?? null,
    harvestDate: harvestDates[0] ?? null,
    notes: data.notes,
  };
}

// ── Sections de la fiche 360° (Brique 2) ─────────────────────────────────────

export interface LotDocument {
  id: string;
  type: DocumentType;
  nomFichier: string;
  statut: DocumentStatut;
}

export interface LotQualityReport {
  id: string;
  source: QcSource;
  verdict: QcVerdict;
  score: number | null;
  defauts: string[];
  recuLe: string | null;
  nomFichier: string | null;
  resume: string | null;
  /** Analyse IA structurée (défauts catégorisés/sévérité), si le PDF a été analysé. */
  analyse: QcAnalysis | null;
}

export interface LotOrigine {
  id: string;
  site: string;
  parcelle: string | null;
  variete: string | null;
  dateRecolte: string | null;
  traitements: string[];
}

export interface LotDetailSections {
  documents: LotDocument[];
  qualite: LotQualityReport[];
  origines: LotOrigine[];
}

/**
 * Charge les sections annexes de la fiche lot (documents, qualité, origine).
 * Ces sections peuvent être vides tant que les briques concernées (3, 6, 8)
 * ne sont pas livrées — la fiche affiche alors un état vide explicite.
 */
export async function getLotDetailSections(lotId: string): Promise<LotDetailSections> {
  const supabase = createAdminClient();

  const [documents, qualite, origines] = await Promise.all([
    supabase
      .from("documents")
      .select("id, type, nom_fichier, statut")
      .eq("lot_id", lotId)
      .order("created_at", { ascending: true }),
    supabase
      .from("rapports_qualite")
      .select(
        "id, source, verdict, score, defauts, recu_le, nom_fichier, resume, analyse_ia",
      )
      .eq("lot_id", lotId)
      .order("recu_le", { ascending: false }),
    supabase
      .from("origines")
      .select("id, site, parcelle, variete, date_recolte, traitements")
      .eq("lot_id", lotId)
      .order("date_recolte", { ascending: true }),
  ]);

  if (documents.error) {
    throw new Error(`Lecture des documents impossible : ${documents.error.message}`);
  }
  if (qualite.error) {
    throw new Error(`Lecture de la qualité impossible : ${qualite.error.message}`);
  }
  if (origines.error) {
    throw new Error(`Lecture de l'origine impossible : ${origines.error.message}`);
  }

  return {
    documents: (documents.data ?? []).map((d) => ({
      id: d.id,
      type: d.type,
      nomFichier: d.nom_fichier,
      statut: d.statut,
    })),
    qualite: (qualite.data ?? []).map((q) => {
      const analyse = qcAnalysisSchema.safeParse(q.analyse_ia);
      return {
        id: q.id,
        source: q.source,
        verdict: q.verdict,
        score: q.score,
        defauts: q.defauts ?? [],
        recuLe: q.recu_le,
        nomFichier: q.nom_fichier,
        resume: q.resume,
        analyse: analyse.success ? (analyse.data as QcAnalysis) : null,
      };
    }),
    origines: (origines.data ?? []).map((o) => ({
      id: o.id,
      site: o.site,
      parcelle: o.parcelle,
      variete: o.variete,
      dateRecolte: o.date_recolte,
      traitements: o.traitements ?? [],
    })),
  };
}
