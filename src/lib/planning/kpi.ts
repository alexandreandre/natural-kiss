/**
 * KPIs de service & réconciliation prévu / réalisé — **purs et testés**
 * (Brique 5, T3 + M3). Aucune dépendance base/réseau ⇒ tests déterministes.
 *
 * Définitions métier retenues (documentées, à ajuster avec Natural Kiss) :
 *   • Un lot est « évalué » pour le service dès qu'il est ARRIVÉ, c.-à-d. qu'il
 *     a une date d'arrivée prévue ET une date d'arrivée réelle.
 *   • Il est « à l'heure » s'il arrive le JOUR prévu ou avant (comparaison au
 *     jour près, tolérante aux heures / fuseaux).
 *   • Taux de service = lots à l'heure / lots évalués.
 *   • Taux de retard  = lots en retard / lots évalués  (= 1 − taux de service).
 */

import { isoWeekFromDate, mondayOfIsoWeek } from "@/lib/planning/week";

const DAY_MS = 86_400_000;

/** Numéro de jour (UTC) de la partie date d'une chaîne ISO, ou `null`. */
function dayNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS;
}

/**
 * Retard (en jours pleins) entre l'arrivée prévue et réelle. Négatif si en
 * avance, 0 si le même jour, positif si en retard. `null` si une date manque.
 */
export function arrivalDelayDays(
  prevue: string | null | undefined,
  reelle: string | null | undefined,
): number | null {
  const a = dayNumber(prevue);
  const b = dayNumber(reelle);
  if (a === null || b === null) return null;
  return b - a;
}

export interface ServiceLot {
  dateArriveePrevue: string | null;
  dateArriveeReelle: string | null;
}

export interface ServiceKpis {
  /** Lots arrivés et évaluables (prévue + réelle connues). */
  evalues: number;
  /** Arrivés à l'heure (jour prévu ou avant). */
  aLheure: number;
  /** Arrivés en retard. */
  enRetard: number;
  /** Taux de service (0–1). */
  tauxService: number;
  /** Taux de retard (0–1). */
  tauxRetard: number;
  /** Retard moyen (jours) sur les seuls lots en retard (0 si aucun). */
  retardMoyenJours: number;
}

/** Calcule les KPIs de service à partir d'un ensemble de lots. */
export function computeServiceKpis(lots: ServiceLot[]): ServiceKpis {
  let evalues = 0;
  let aLheure = 0;
  let enRetard = 0;
  let sommeRetards = 0;

  for (const lot of lots) {
    const delay = arrivalDelayDays(lot.dateArriveePrevue, lot.dateArriveeReelle);
    if (delay === null) continue;
    evalues += 1;
    if (delay > 0) {
      enRetard += 1;
      sommeRetards += delay;
    } else {
      aLheure += 1;
    }
  }

  return {
    evalues,
    aLheure,
    enRetard,
    tauxService: evalues === 0 ? 0 : aLheure / evalues,
    tauxRetard: evalues === 0 ? 0 : enRetard / evalues,
    retardMoyenJours: enRetard === 0 ? 0 : sommeRetards / enRetard,
  };
}

// ── Réconciliation prévu / réalisé du planning ───────────────────────────────

export type PlanningEtat = "planifie" | "realise" | "glissement";

/** Lundi (`YYYY-MM-DD`) d'une clé ISO `YYYY-Www`, ou `null`. */
function mondayOfIso(semaineIso: string): string | null {
  const m = semaineIso.trim().match(/^(\d{4})-W(\d{1,2})$/);
  if (!m) return null;
  return mondayOfIsoWeek(Number(m[1]), Number(m[2]));
}

export interface PlanningReconInput {
  /** Semaine ISO PRÉVUE de la ligne de planning. */
  semaineIso: string;
  /** Lot réalisé rattaché (ou `null` si non encore rattaché). */
  lot: { dateDepart: string | null } | null;
}

export interface PlanningReconResult {
  etat: PlanningEtat;
  /** Semaine ISO du départ réel (si le lot est parti). */
  semaineReelleIso: string | null;
  /** Écart en semaines (réel − prévu). Positif = parti plus tard. */
  ecartSemaines: number;
}

/**
 * Rapproche une ligne de planning de son réalisé :
 *   • pas de lot parti            → `planifie`
 *   • parti la semaine prévue     → `realise`
 *   • parti une autre semaine     → `glissement` (+ écart en semaines)
 */
export function reconcilePlanningLine(input: PlanningReconInput): PlanningReconResult {
  const depart = input.lot?.dateDepart ?? null;
  if (!depart) {
    return { etat: "planifie", semaineReelleIso: null, ecartSemaines: 0 };
  }

  const reelle = isoWeekFromDate(depart);
  if (!reelle) {
    return { etat: "planifie", semaineReelleIso: null, ecartSemaines: 0 };
  }

  if (reelle.iso === input.semaineIso) {
    return { etat: "realise", semaineReelleIso: reelle.iso, ecartSemaines: 0 };
  }

  const mondayPrevu = mondayOfIso(input.semaineIso);
  let ecartSemaines = 0;
  if (mondayPrevu) {
    const a = dayNumber(mondayPrevu);
    const b = dayNumber(reelle.monday);
    if (a !== null && b !== null) ecartSemaines = Math.round((b - a) / 7);
  }

  return { etat: "glissement", semaineReelleIso: reelle.iso, ecartSemaines };
}

export interface PlanningSummary {
  total: number;
  planifie: number;
  /** Lots effectivement partis (realise + glissement). */
  parti: number;
  realise: number;
  glissement: number;
  /** Taux de réalisation = partis / total (0–1). */
  tauxRealisation: number;
  /** Ponctualité de départ = réalisés à l'heure / partis (0–1). */
  ponctualiteDepart: number;
}

/** Agrège les états de plusieurs lignes de planning en indicateurs de synthèse. */
export function summarizePlanning(etats: PlanningEtat[]): PlanningSummary {
  const total = etats.length;
  const planifie = etats.filter((e) => e === "planifie").length;
  const realise = etats.filter((e) => e === "realise").length;
  const glissement = etats.filter((e) => e === "glissement").length;
  const parti = realise + glissement;

  return {
    total,
    planifie,
    parti,
    realise,
    glissement,
    tauxRealisation: total === 0 ? 0 : parti / total,
    ponctualiteDepart: parti === 0 ? 0 : realise / parti,
  };
}
