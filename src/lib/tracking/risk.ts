import type { TransportMode } from "@/lib/adapters/types";

/**
 * Score de risque d'arrivée — logique **pure et testée** (Brique 1, §4 stratégie).
 *
 * Le risque combine trois facteurs indépendants, chacun plafonné, dont la somme
 * donne un score 0–100 :
 *   1. Âge de la marchandise à l'expédition (récolte → départ).
 *   2. Durée de transit (départ → arrivée), pondérée par le mode.
 *   3. Excursions de température par rapport à la consigne (datalogger).
 *
 * Aucune dépendance à la base ni au réseau : entrées simples ⇒ tests reproductibles.
 */

export type RiskBand = "faible" | "moyen" | "eleve";

export type RiskFactorKey = "harvestAge" | "transit" | "excursion";

export interface RiskFactor {
  key: RiskFactorKey;
  /** Points de risque apportés par ce facteur (0 → max). */
  points: number;
  /** Points maximum atteignables pour ce facteur. */
  max: number;
  /** Grandeur mesurée qui a produit ces points (jours, °C, …). */
  measured: number;
}

export interface RiskResult {
  score: number;
  band: RiskBand;
  factors: RiskFactor[];
}

export interface RiskReading {
  at: string;
  tempC: number;
}

export interface RiskInput {
  mode: TransportMode;
  /** Consigne de température (°C). Sans elle, l'excursion n'est pas évaluée. */
  targetTempC: number | null;
  /** Date de récolte (ISO) — sinon l'âge n'est pas évalué. */
  harvestDate?: string | null;
  departureAt?: string | null;
  arrivalAt?: string | null;
  readings: RiskReading[];
}

// Pondération : marchandise + transit + froid = 30 + 30 + 40 = 100.
const MAX_HARVEST = 30;
const MAX_TRANSIT = 30;
const MAX_EXCURSION = 40;

/** Jours de fraîcheur "gratuits" avant que l'âge ne pèse. */
const FRESH_DAYS = 4;
/** Jours de transit "normaux" par mode avant pénalité. */
const TRANSIT_BASELINE_DAYS: Record<TransportMode, number> = {
  air: 2,
  road: 3,
  roro: 6,
  sea: 7,
};
/** Tolérance (±°C) autour de la consigne avant de compter une excursion. */
const TEMP_TOLERANCE_C = 2;

const DAY_MS = 86_400_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function diffDays(from?: string | null, to?: string | null): number | null {
  if (!from || !to) return null;
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return (b - a) / DAY_MS;
}

function harvestFactor(input: RiskInput): RiskFactor {
  const age = diffDays(input.harvestDate, input.departureAt ?? input.arrivalAt);
  const measured = age === null ? 0 : Math.max(0, age);
  const points = clamp((measured - FRESH_DAYS) * 3, 0, MAX_HARVEST);
  return { key: "harvestAge", points, max: MAX_HARVEST, measured };
}

function transitFactor(input: RiskInput): RiskFactor {
  const transit = diffDays(input.departureAt, input.arrivalAt);
  const measured = transit === null ? 0 : Math.max(0, transit);
  const baseline = TRANSIT_BASELINE_DAYS[input.mode];
  const points = clamp((measured - baseline) * 2.5, 0, MAX_TRANSIT);
  return { key: "transit", points, max: MAX_TRANSIT, measured };
}

function excursionFactor(input: RiskInput): RiskFactor {
  const { targetTempC, readings } = input;
  if (targetTempC === null || readings.length === 0) {
    return { key: "excursion", points: 0, max: MAX_EXCURSION, measured: 0 };
  }
  let maxDeviation = 0;
  let outOfRange = 0;
  for (const r of readings) {
    const deviation = Math.abs(r.tempC - targetTempC) - TEMP_TOLERANCE_C;
    if (deviation > 0) {
      outOfRange += 1;
      if (deviation > maxDeviation) maxDeviation = deviation;
    }
  }
  const fractionOut = outOfRange / readings.length;
  const points = clamp(maxDeviation * 3 + fractionOut * 20, 0, MAX_EXCURSION);
  // Grandeur mise en avant : dépassement maximal (°C au-delà de la tolérance).
  return { key: "excursion", points, max: MAX_EXCURSION, measured: maxDeviation };
}

export function bandForScore(score: number): RiskBand {
  if (score >= 70) return "eleve";
  if (score >= 40) return "moyen";
  return "faible";
}

/** Calcule le score de risque d'arrivée (0–100) et sa ventilation par facteur. */
export function computeArrivalRisk(input: RiskInput): RiskResult {
  const factors = [harvestFactor(input), transitFactor(input), excursionFactor(input)];
  const score = Math.round(factors.reduce((sum, f) => sum + f.points, 0));
  return { score, band: bandForScore(score), factors };
}
