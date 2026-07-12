/**
 * T5 — Moteur d'alertes proactives (Brique 8) : règles **pures**, sans base ni
 * réseau → testables. Chaque détecteur consomme la sortie d'un adaptateur déjà
 * résolu (TrackingProvider, SensorProvider) ou de la Gate (M6) et renvoie une
 * alerte candidate (ou `null` si rien à signaler).
 */

export type AlerteType =
  | "retard_navire"
  | "excursion_temperature"
  | "document_manquant"
  | "risque_quarantaine";

export type AlerteSeverite = "info" | "avertissement" | "critique";

export interface AlerteCandidate {
  type: AlerteType;
  severite: AlerteSeverite;
  message: string;
  valeurMesuree: number | null;
}

const DAY_MS = 86_400_000;
/** Retard toléré avant de déclencher une alerte (heures). */
const DELAY_GRACE_HOURS = 12;
/** Tolérance (±°C) autour de la consigne avant de compter une excursion. */
const TEMP_TOLERANCE_C = 2;

export interface DelayInput {
  statut: string;
  dateArriveePrevue: string | null;
  dateArriveeReelle: string | null;
  now?: Date;
}

/** Retard navire/vol : comparaison ETA vs arrivée réelle (ou "maintenant" si en transit). */
export function detectDelayAlert(input: DelayInput): AlerteCandidate | null {
  const { statut, dateArriveePrevue, dateArriveeReelle } = input;
  if (!dateArriveePrevue) return null;
  if (["booking", "cloture"].includes(statut)) return null;

  const prevue = Date.parse(dateArriveePrevue);
  if (Number.isNaN(prevue)) return null;

  const reference = dateArriveeReelle
    ? Date.parse(dateArriveeReelle)
    : (input.now ?? new Date()).getTime();
  if (Number.isNaN(reference)) return null;

  const delayHours = (reference - prevue) / (DAY_MS / 24);
  if (delayHours <= DELAY_GRACE_HOURS) return null;

  const delayDays = delayHours / 24;
  return {
    type: "retard_navire",
    severite: delayDays >= 2 ? "critique" : "avertissement",
    message: dateArriveeReelle
      ? `Arrivée constatée ${delayDays.toFixed(1)} j après l'ETA prévue.`
      : `Toujours pas arrivé, ${delayDays.toFixed(1)} j après l'ETA prévue.`,
    valeurMesuree: Number(delayDays.toFixed(2)),
  };
}

export interface ExcursionInput {
  targetTempC: number | null;
  readings: { tempC: number }[];
}

/** Excursion de température : dépassement de la consigne au-delà de la tolérance. */
export function detectExcursionAlert(input: ExcursionInput): AlerteCandidate | null {
  const { targetTempC, readings } = input;
  if (targetTempC === null || readings.length === 0) return null;

  let maxDeviation = 0;
  let outOfRange = 0;
  for (const r of readings) {
    const deviation = Math.abs(r.tempC - targetTempC) - TEMP_TOLERANCE_C;
    if (deviation > 0) {
      outOfRange += 1;
      if (deviation > maxDeviation) maxDeviation = deviation;
    }
  }
  if (outOfRange === 0) return null;

  const fractionOut = outOfRange / readings.length;
  return {
    type: "excursion_temperature",
    severite: maxDeviation >= 5 || fractionOut >= 0.3 ? "critique" : "avertissement",
    message: `Excursion de température : dépassement max ${(targetTempC + maxDeviation + TEMP_TOLERANCE_C).toFixed(1)} °C (consigne ${targetTempC} °C ± ${TEMP_TOLERANCE_C} °C), ${Math.round(fractionOut * 100)} % des relevés hors tolérance.`,
    valeurMesuree: Number(maxDeviation.toFixed(2)),
  };
}

export interface MissingDocInput {
  missing: string[];
}

/** Document manquant au dossier d'expédition (checklist Gate, M6). */
export function detectMissingDocumentAlert(
  input: MissingDocInput,
): AlerteCandidate | null {
  if (input.missing.length === 0) return null;
  return {
    type: "document_manquant",
    severite: "avertissement",
    message: `Document(s) manquant(s) : ${input.missing.join(", ")}.`,
    valeurMesuree: input.missing.length,
  };
}

export interface QuarantineInput {
  /** Règles de conformité en échec (Déclaration Additionnelle, règlement slips…). */
  failingRules: { regle: string; libelle: string }[];
}

/** Risque de quarantaine douanière (organismes de quarantaine non couverts). */
export function detectQuarantineRiskAlert(
  input: QuarantineInput,
): AlerteCandidate | null {
  if (input.failingRules.length === 0) return null;
  return {
    type: "risque_quarantaine",
    severite: "critique",
    message: `Risque de quarantaine : ${input.failingRules.map((r) => r.libelle).join(", ")}.`,
    valeurMesuree: input.failingRules.length,
  };
}
