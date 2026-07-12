import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeServiceKpis,
  reconcilePlanningLine,
  summarizePlanning,
  type PlanningEtat,
  type PlanningSummary,
  type ServiceKpis,
} from "@/lib/planning/kpi";
import {
  normalize,
  type ImportError,
  type ParsedPlanningRow,
} from "@/lib/planning/parse";
import {
  listLotsFiltered,
  getLotFilterOptions,
  type LotFilters,
  type LotFilterOptions,
  type LotListItem,
  type LotStatut,
} from "@/lib/data/lots";
import { bandForScore, type RiskBand } from "@/lib/tracking/risk";

// ── Vue planning (prévu vs réalisé) ──────────────────────────────────────────

export interface PlanningLine {
  id: string;
  semaineIso: string;
  semaineDebut: string;
  clientNom: string | null;
  produit: string;
  variete: string | null;
  destinationPays: string | null;
  destinationPort: string | null;
  quantitePrevue: number | null;
  unite: string | null;
  source: string;
  lotReference: string | null;
  lotStatut: LotStatut | null;
  lotDateDepart: string | null;
  etat: PlanningEtat;
  semaineReelleIso: string | null;
  ecartSemaines: number;
}

export interface PlanningView {
  lines: PlanningLine[];
  summary: PlanningSummary;
}

interface PlanningRow {
  id: string;
  semaine_iso: string;
  semaine_debut: string;
  client_nom: string | null;
  produit: string;
  variete: string | null;
  destination_pays: string | null;
  destination_port: string | null;
  quantite_prevue: number | null;
  unite: string | null;
  source: string;
  lot?: { reference: string; statut: LotStatut; date_depart: string | null } | null;
}

const PLANNING_SELECT =
  "id, semaine_iso, semaine_debut, client_nom, produit, variete, destination_pays, destination_port, quantite_prevue, unite, source, lot:lots(reference, statut, date_depart)";

/** Planning complet, réconcilié avec le réalisé (lot parti). */
export async function getPlanningView(): Promise<PlanningView> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("planning")
    .select(PLANNING_SELECT)
    .order("semaine_debut", { ascending: true })
    .order("client_nom", { ascending: true });

  if (error) throw new Error(`Lecture du planning impossible : ${error.message}`);

  const lines: PlanningLine[] = (data ?? []).map((row) => {
    const r = row as PlanningRow;
    const recon = reconcilePlanningLine({
      semaineIso: r.semaine_iso,
      lot: r.lot ? { dateDepart: r.lot.date_depart } : null,
    });
    return {
      id: r.id,
      semaineIso: r.semaine_iso,
      semaineDebut: r.semaine_debut,
      clientNom: r.client_nom,
      produit: r.produit,
      variete: r.variete,
      destinationPays: r.destination_pays,
      destinationPort: r.destination_port,
      quantitePrevue: r.quantite_prevue,
      unite: r.unite,
      source: r.source,
      lotReference: r.lot?.reference ?? null,
      lotStatut: r.lot?.statut ?? null,
      lotDateDepart: r.lot?.date_depart ?? null,
      etat: recon.etat,
      semaineReelleIso: recon.semaineReelleIso,
      ecartSemaines: recon.ecartSemaines,
    };
  });

  return { lines, summary: summarizePlanning(lines.map((l) => l.etat)) };
}

// ── Dashboard & KPIs (T3) ────────────────────────────────────────────────────

export type { LotFilterOptions };

export interface DashboardFilters {
  clientId?: string;
  produit?: string;
  pays?: string;
  risque?: RiskBand;
}

export interface CountItem<K extends string = string> {
  key: K;
  count: number;
}

export interface DashboardData {
  lots: LotListItem[];
  kpis: ServiceKpis;
  total: number;
  enTransit: number;
  byStatut: CountItem<LotStatut>[];
  byPays: CountItem[];
  byRisque: CountItem<RiskBand>[];
  options: LotFilterOptions;
}

const STATUT_ORDER: LotStatut[] = [
  "booking",
  "chargement",
  "transit",
  "arrive",
  "livre",
  "cloture",
  "rejete",
];
const RISK_ORDER: RiskBand[] = ["faible", "moyen", "eleve"];

/** Bande de risque d'un lot (score nul → « faible » par défaut). */
export function lotRiskBand(scoreRisque: number | null): RiskBand {
  return bandForScore(scoreRisque ?? 0);
}

/**
 * Données du dashboard : lots filtrés (client / produit / pays / risque),
 * KPIs de service et agrégats pour les graphes.
 */
export async function getDashboardData(
  filters: DashboardFilters = {},
): Promise<DashboardData> {
  const lotFilters: LotFilters = {
    clientId: filters.clientId,
    produit: filters.produit,
    pays: filters.pays,
  };

  const [all, options] = await Promise.all([
    listLotsFiltered(lotFilters, 500),
    getLotFilterOptions(),
  ]);

  // Le risque est dérivé du score → on filtre en mémoire.
  const lots = filters.risque
    ? all.filter((l) => lotRiskBand(l.scoreRisque) === filters.risque)
    : all;

  const kpis = computeServiceKpis(
    lots.map((l) => ({
      dateArriveePrevue: l.dateArriveePrevue,
      dateArriveeReelle: l.dateArriveeReelle,
    })),
  );

  const statutCounts = new Map<LotStatut, number>();
  const paysCounts = new Map<string, number>();
  const risqueCounts = new Map<RiskBand, number>();
  let enTransit = 0;

  for (const l of lots) {
    statutCounts.set(l.statut, (statutCounts.get(l.statut) ?? 0) + 1);
    if (l.statut === "transit") enTransit += 1;
    const pays = l.destinationPays ?? "—";
    paysCounts.set(pays, (paysCounts.get(pays) ?? 0) + 1);
    const band = lotRiskBand(l.scoreRisque);
    risqueCounts.set(band, (risqueCounts.get(band) ?? 0) + 1);
  }

  const byStatut = STATUT_ORDER.filter((s) => statutCounts.has(s)).map((key) => ({
    key,
    count: statutCounts.get(key)!,
  }));
  const byPays = [...paysCounts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  const byRisque = RISK_ORDER.map((key) => ({
    key,
    count: risqueCounts.get(key) ?? 0,
  }));

  return {
    lots,
    kpis,
    total: lots.length,
    enTransit,
    byStatut,
    byPays,
    byRisque,
    options,
  };
}

// ── Import Excel → lignes de planning ────────────────────────────────────────

export interface ImportOutcome {
  inserted: number;
  matchedLots: number;
  matchedClients: number;
}

/**
 * Insère des lignes de planning issues d'un import Excel/CSV. Idempotent : les
 * lignes de `source = 'import'` précédentes sont remplacées. Résout au passage
 * le nom de client → `client_id` et la référence de lot → `lot_id`.
 */
export async function importPlanningRows(
  parsed: ParsedPlanningRow[],
): Promise<ImportOutcome> {
  const supabase = createAdminClient();

  // Référentiel clients (résolution nom → id, tolérante aux accents/casse).
  const { data: clients, error: clientsErr } = await supabase
    .from("clients")
    .select("id, nom");
  if (clientsErr)
    throw new Error(`Lecture des clients impossible : ${clientsErr.message}`);
  const clientByName = new Map<string, string>();
  for (const c of clients ?? []) clientByName.set(normalize(c.nom), c.id);

  // Résolution des références de lot (référence interne OU n° de conteneur).
  const refs = [
    ...new Set(
      parsed
        .map((p) => p.lotReference)
        .filter((r): r is string => Boolean(r))
        .map((r) => r.trim()),
    ),
  ];
  const lotByRef = new Map<string, string>();
  if (refs.length > 0) {
    const { data: lots, error: lotsErr } = await supabase
      .from("lots")
      .select("id, reference, numero_conteneur")
      .or(`reference.in.(${refs.join(",")}),numero_conteneur.in.(${refs.join(",")})`);
    if (lotsErr) throw new Error(`Résolution des lots impossible : ${lotsErr.message}`);
    for (const l of lots ?? []) {
      lotByRef.set(normalize(l.reference), l.id);
      if (l.numero_conteneur) lotByRef.set(normalize(l.numero_conteneur), l.id);
    }
  }

  let matchedLots = 0;
  let matchedClients = 0;

  const rows = parsed.map((p) => {
    const clientId = p.clientNom ? resolveClient(clientByName, p.clientNom) : null;
    if (clientId) matchedClients += 1;
    const lotId = p.lotReference
      ? (lotByRef.get(normalize(p.lotReference)) ?? null)
      : null;
    if (lotId) matchedLots += 1;
    return {
      semaine_iso: p.semaineIso,
      semaine_debut: p.semaineDebut,
      client_id: clientId,
      client_nom: p.clientNom,
      produit: p.produit,
      variete: p.variete,
      destination_pays: p.destinationPays,
      destination_port: p.destinationPort,
      quantite_prevue: p.quantitePrevue,
      unite: p.unite,
      lot_id: lotId,
      source: "import",
    };
  });

  // Idempotence : on remplace l'import précédent (le seed 'seed' est préservé).
  const { error: delErr } = await supabase
    .from("planning")
    .delete()
    .eq("source", "import");
  if (delErr)
    throw new Error(`Nettoyage de l'import précédent impossible : ${delErr.message}`);

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("planning").insert(rows);
    if (insErr) throw new Error(`Insertion du planning impossible : ${insErr.message}`);
  }

  return { inserted: rows.length, matchedLots, matchedClients };
}

function resolveClient(index: Map<string, string>, name: string): string | null {
  const norm = normalize(name);
  if (index.has(norm)) return index.get(norm)!;
  // Repli : correspondance par préfixe (« Barfoots » ↔ « Barfoots of Botley Ltd »).
  for (const [key, id] of index) {
    if (key.startsWith(norm) || norm.startsWith(key)) return id;
  }
  return null;
}

export type { ImportError };
