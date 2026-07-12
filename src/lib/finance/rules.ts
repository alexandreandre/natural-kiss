import type { DocAnomaly } from "@/lib/adapters/types";

/**
 * M10 — Règles financières **pures** (Brique 8) : cohérence facture (relié au
 * vérificateur IA de la Gate, Brique 3) et agrégation des litiges. Sans base ni
 * réseau → entièrement testables.
 */

export type FactureCoherence = "coherente" | "incoherente" | "inconnue";

/**
 * Cohérence facture = dérivée des anomalies documentaires déjà produites par
 * le `DocVerifierProvider` (Brique 3) : toute anomalie impliquant la facture
 * (source `facture`) la rend incohérente. Aucune vérification exécutée pour ce
 * lot → statut inconnu (pas encore de Gate lancée).
 */
export function computeFactureCoherence(
  anomalies: Pick<DocAnomaly, "valeurs">[],
  gateHasRun: boolean,
): FactureCoherence {
  if (!gateHasRun) return "inconnue";
  const touchesFacture = anomalies.some((a) =>
    (a.valeurs.sources ?? []).includes("facture"),
  );
  return touchesFacture ? "incoherente" : "coherente";
}

export type LitigeStatut = "ouvert" | "en_cours" | "resolu" | "clos";

/** Un litige bloque le paiement tant qu'il n'est pas résolu ou clos. */
export function isLitigeBlocking(statut: LitigeStatut): boolean {
  return statut === "ouvert" || statut === "en_cours";
}

export type PaiementStatut = "a_venir" | "en_attente" | "partiel" | "paye" | "litige";

/**
 * Statut de paiement effectif d'un lot : un litige non résolu prime toujours
 * sur le statut déclaré (documents/paiement retenus tant que le litige dure).
 */
export function effectivePaymentStatus(
  declared: PaiementStatut,
  litiges: { statut: LitigeStatut }[],
): PaiementStatut {
  if (litiges.some((l) => isLitigeBlocking(l.statut))) return "litige";
  return declared;
}
