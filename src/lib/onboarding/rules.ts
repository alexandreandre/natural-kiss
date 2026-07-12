/**
 * Règles métier **pures** de la Brique 7 (Demande & Qualification) — sans base
 * ni réseau, donc entièrement testables :
 *   • normalisation produit / pays,
 *   • matrice des certifications requises par pays × produit (× client),
 *   • matching de couverture contre le coffre M0c → décision suffisant/insuffisant,
 *   • détection des certifications proches de l'expiration.
 *
 * Le matching s'appuie STRICTEMENT sur les certifications fournies (coffre M0c) :
 * aucune certif n'est inventée. La couche service lit le coffre en base et passe
 * ces règles ; l'UI et les tests consomment le même résultat structuré.
 */

export type CertifType = "ggap" | "grasp" | "brcgs" | "smeta" | "sedex";
export type CertifStatut = "valide" | "suspendue" | "expiree";
export type Decision = "suffisant" | "insuffisant";

/** Libellés lisibles des types de certification. */
export const CERTIF_LABELS: Record<CertifType, string> = {
  ggap: "GlobalG.A.P.",
  grasp: "GRASP",
  brcgs: "BRCGS",
  smeta: "SMETA",
  sedex: "Sedex",
};

/** Jeton de couverture « toutes destinations / tous produits ». */
export const COVERAGE_ALL = "ALL";

/** Une certification du coffre (M0c), forme neutre pour le matching. */
export interface CoffreCert {
  type: CertifType;
  /** Familles produit couvertes (jetons normalisés) ; `['ALL']` = tous. */
  produits: string[];
  /** Pays couverts (codes ISO majuscules) ; `['ALL']` = tous. */
  pays: string[];
  statut: CertifStatut;
  dateExpiration: string | null;
}

export interface MatchInput {
  produit: string;
  pays: string;
  clientNom?: string | null;
  coffre: CoffreCert[];
}

export interface CertifManquante {
  type: CertifType;
  raison: string;
}

export interface MatchResult {
  /** Famille produit normalisée retenue. */
  produitFamille: string;
  /** Code pays normalisé. */
  paysCode: string;
  requises: CertifType[];
  couvertes: CertifType[];
  manquantes: CertifManquante[];
  decision: Decision;
  raison: string;
}

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Familles produit reconnues (jetons de couverture). Reprend le vocabulaire de
 * la base de connaissance (Tenderstem/Bimi = brocoli, patate douce, ail, fraise,
 * slips, mangue). Le premier motif qui matche gagne.
 */
const PRODUIT_FAMILLES: { match: RegExp; famille: string }[] = [
  { match: /brocc|brocoli|tenderstem|bimi|psb|brassic/i, famille: "brocoli" },
  { match: /slip|plant/i, famille: "slips" },
  { match: /patate douce|sweet ?potato/i, famille: "patate_douce" },
  { match: /mangue|mango/i, famille: "mangue" },
  { match: /ail|garlic/i, famille: "ail" },
  { match: /fraise|strawberr/i, famille: "fraise" },
];

/** Normalise un libellé produit vers sa famille de couverture. */
export function normalizeProduit(produit: string): string {
  const found = PRODUIT_FAMILLES.find((p) => p.match.test(produit));
  if (found) return found.famille;
  return produit
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Alias pays fréquents → code ISO (majuscules). */
const PAYS_ALIAS: Record<string, string> = {
  "ROYAUME-UNI": "UK",
  "ROYAUME UNI": "UK",
  ANGLETERRE: "UK",
  GB: "UK",
  "GREAT BRITAIN": "UK",
  "UNITED KINGDOM": "UK",
  FRANCE: "FR",
  "PAYS-BAS": "NL",
  "PAYS BAS": "NL",
  NETHERLANDS: "NL",
  HOLLANDE: "NL",
  RUSSIE: "RU",
  RUSSIA: "RU",
  ALLEMAGNE: "DE",
  ESPAGNE: "ES",
  ITALIE: "IT",
  PORTUGAL: "PT",
};

/** Normalise un pays (nom ou code) vers un code ISO majuscule. */
export function normalizePays(pays: string): string {
  const up = pays.trim().toUpperCase();
  return PAYS_ALIAS[up] ?? up;
}

// ── Matrice des certifications requises ───────────────────────────────────────

/**
 * Certifications de base exigées pour TOUT couple produit × pays : la
 * certification produit GlobalG.A.P. + son module social GRASP (base de
 * connaissance §6 : couverture GGAP + GRASP pour brocoli/fraise/patate douce).
 */
const BASE_REQUISES: CertifType[] = ["ggap", "grasp"];

/**
 * Exigences additionnelles côté distributeur UK (type Barfoots / SHP) :
 * BRCGS packhouse + audit social SMETA + plateforme Sedex (base de connaissance
 * §4.1 : processus d'approbation SMETA, BRCGS, Sedex, PPPL / Food Experts).
 */
const UK_REQUISES: CertifType[] = ["brcgs", "smeta", "sedex"];

/** Marchés UE (retail F&L) exigeant BRCGS packhouse en plus de la base. */
const EU_COUNTRIES = new Set([
  "FR",
  "NL",
  "IT",
  "DE",
  "ES",
  "BE",
  "PT",
  "PL",
  "IE",
  "AT",
  "SE",
  "DK",
  "FI",
]);

/**
 * Certifications requises pour un couple produit × pays (× client). La matrice
 * exacte par client reste à confirmer (cf. prompt) ; on applique une matrice par
 * défaut défendable, alignée sur la base de connaissance.
 */
export function requiredCertifs(
  produitFamille: string,
  paysCode: string,
): CertifType[] {
  const set = new Set<CertifType>(BASE_REQUISES);
  if (paysCode === "UK") {
    for (const c of UK_REQUISES) set.add(c);
  } else if (EU_COUNTRIES.has(paysCode)) {
    set.add("brcgs");
  }
  return [...set];
}

// ── Matching de couverture ────────────────────────────────────────────────────

function covers(list: string[], value: string): boolean {
  return list.includes(COVERAGE_ALL) || list.includes(value);
}

/** Une certif du coffre couvre-t-elle ce produit × pays et est-elle valide ? */
export function certCovers(
  cert: CoffreCert,
  produitFamille: string,
  paysCode: string,
): boolean {
  return (
    cert.statut === "valide" &&
    covers(cert.produits, produitFamille) &&
    covers(cert.pays, paysCode)
  );
}

/**
 * Matching automatique : compare les certifications requises (matrice) au coffre
 * M0c fourni. Renvoie la décision (suffisant / insuffisant), les certifs
 * couvertes et la liste des manquantes avec leur raison (traçabilité).
 */
export function matchDemande(input: MatchInput): MatchResult {
  const produitFamille = normalizeProduit(input.produit);
  const paysCode = normalizePays(input.pays);
  const requises = requiredCertifs(produitFamille, paysCode);

  const couvertes: CertifType[] = [];
  const manquantes: CertifManquante[] = [];

  for (const type of requises) {
    const candidates = input.coffre.filter((c) => c.type === type);
    if (candidates.length === 0) {
      manquantes.push({
        type,
        raison: `${CERTIF_LABELS[type]} absente du coffre.`,
      });
      continue;
    }
    if (candidates.some((c) => certCovers(c, produitFamille, paysCode))) {
      couvertes.push(type);
      continue;
    }
    // Présente mais ne couvre pas ce produit/pays (ou non valide).
    const suspendue = candidates.some((c) => c.statut !== "valide");
    manquantes.push({
      type,
      raison: suspendue
        ? `${CERTIF_LABELS[type]} présente mais non valide (suspendue / expirée).`
        : `${CERTIF_LABELS[type]} ne couvre pas ${input.produit} → ${paysCode}.`,
    });
  }

  const decision: Decision = manquantes.length === 0 ? "suffisant" : "insuffisant";
  const raison =
    decision === "suffisant"
      ? `Toutes les certifications requises (${requises
          .map((t) => CERTIF_LABELS[t])
          .join(", ")}) sont couvertes pour ${input.produit} → ${paysCode}.`
      : `Certification(s) manquante(s) : ${manquantes
          .map((m) => CERTIF_LABELS[m.type])
          .join(", ")}.`;

  return {
    produitFamille,
    paysCode,
    requises,
    couvertes,
    manquantes,
    decision,
    raison,
  };
}

// ── Alertes d'expiration ──────────────────────────────────────────────────────

export interface ExpirationAlert {
  type: CertifType;
  dateExpiration: string;
  joursRestants: number;
  expiree: boolean;
}

/** Nombre de jours calendaires entre deux dates (peut être négatif). */
function daysUntil(dateIso: string, from: Date): number {
  const target = new Date(dateIso).getTime();
  const ms = target - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Certifications proches de l'expiration (ou déjà expirées) sous `seuilJours`.
 * Le coffre M0c doit alerter AVANT expiration pour éviter les blocages (KB §2).
 */
export function certificationsExpirantSous(
  certs: CoffreCert[],
  seuilJours = 30,
  now: Date = new Date(),
): ExpirationAlert[] {
  const alerts: ExpirationAlert[] = [];
  for (const c of certs) {
    if (!c.dateExpiration) continue;
    const joursRestants = daysUntil(c.dateExpiration, now);
    if (joursRestants <= seuilJours) {
      alerts.push({
        type: c.type,
        dateExpiration: c.dateExpiration,
        joursRestants,
        expiree: joursRestants < 0,
      });
    }
  }
  return alerts.sort((a, b) => a.joursRestants - b.joursRestants);
}
