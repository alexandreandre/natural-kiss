import type { DocAnomaly, VerifierDoc } from "@/lib/adapters/types";

/**
 * Règles métier **pures** de la Gate « Check OK » (Brique 3) — sans base ni
 * réseau, donc entièrement testables :
 *   • checklist de conformité par pays/produit (Déclaration Additionnelle UE,
 *     règlement (UE) 2021/2285, code HS, couverture GGAP/GRASP, preuve produit) ;
 *   • agrégation du statut de Gate (vert / rouge / en_attente).
 *
 * La cohérence croisée documentaire (anomalies) est produite par le
 * `DocVerifierProvider` (adaptateur mock → LLM réel) ; ici on la consomme.
 */

export type ConformiteStatut = "ok" | "manquant" | "non_conforme" | "non_applicable";

export interface ConformiteCheck {
  regle: string;
  libelle: string;
  statut: ConformiteStatut;
  message: string | null;
}

export type GateStatut = "en_attente" | "vert" | "rouge";

export interface ConformiteInput {
  produit: string;
  destinationPays: string | null;
  documents: VerifierDoc[];
  hasPreuve: boolean;
}

/** Documents obligatoires au dossier d'expédition. */
export const REQUIRED_DOC_TYPES = ["facture", "bl", "phyto", "packing_list"] as const;

/** Organismes visés par la Déclaration Additionnelle UE (base de connaissance §6). */
export const DECLARATION_ADDITIONNELLE_ORGANISMES = [
  "Thrips palmi",
  "Bemisia tabaci",
  "Liriomyza sativae",
  "Nemorimyza maculosa",
] as const;

/** Destinations relevant du régime phytosanitaire UE (déclaration additionnelle). */
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
  "GR",
  "CZ",
  "RO",
  "HU",
  "SK",
  "BG",
  "HR",
  "SI",
  "LT",
  "LV",
  "EE",
  "LU",
  "CY",
  "MT",
]);

/** Codes HS attendus par famille de produit (contrôle de bon classement). */
const EXPECTED_HS: { match: RegExp; hs: string }[] = [
  { match: /brocc|tenderstem|bimi|brassic/i, hs: "07041000" },
  { match: /slip|plant/i, hs: "06029050" },
  { match: /patate douce|sweet ?potato/i, hs: "07142000" },
  { match: /ail|garlic/i, hs: "07032000" },
  { match: /fraise|strawberr/i, hs: "08101000" },
];

function isEuDestination(pays: string | null): boolean {
  return pays ? EU_COUNTRIES.has(pays.trim().toUpperCase()) : false;
}

/** Produits soumis à la Déclaration Additionnelle (plants & légumes sensibles). */
function isDeclarationAdditionnelleSubject(produit: string): boolean {
  return /slip|plant|brocc|tenderstem|bimi|brassic|chou|feuille|leaf|herb/i.test(
    produit,
  );
}

/** Produits « plants destinés à la plantation » relevant du règlement 2021/2285. */
function isSlips(produit: string): boolean {
  return /slip|plant/i.test(produit);
}

function expectedHsFor(produit: string): string | null {
  return EXPECTED_HS.find((e) => e.match.test(produit))?.hs ?? null;
}

function findDoc(docs: VerifierDoc[], type: string): VerifierDoc | undefined {
  return docs.find((d) => d.type === type);
}

/**
 * Évalue la checklist de conformité d'un lot. Chaque règle renvoie un statut ;
 * une règle non pertinente pour ce couple pays/produit est `non_applicable`.
 */
export function evaluateConformite(input: ConformiteInput): ConformiteCheck[] {
  const { produit, destinationPays, documents, hasPreuve } = input;
  const checks: ConformiteCheck[] = [];

  // 1) Documents obligatoires présents.
  const missing = REQUIRED_DOC_TYPES.filter((t) => !findDoc(documents, t));
  checks.push({
    regle: "documents_requis",
    libelle: "Documents obligatoires présents",
    statut: missing.length === 0 ? "ok" : "manquant",
    message:
      missing.length === 0 ? null : `Documents manquants : ${missing.join(", ")}.`,
  });

  // 2) Déclaration Additionnelle UE (Thrips palmi, Bemisia tabaci…).
  const daApplicable =
    isEuDestination(destinationPays) && isDeclarationAdditionnelleSubject(produit);
  if (!daApplicable) {
    checks.push({
      regle: "declaration_additionnelle_ue",
      libelle: "Déclaration Additionnelle UE (organismes de quarantaine)",
      statut: "non_applicable",
      message: "Non requise pour ce couple produit / destination.",
    });
  } else {
    const phyto = findDoc(documents, "phyto");
    const declared = (phyto?.metadata.declarationAdditionnelle ?? []).map((o) =>
      o.toLowerCase(),
    );
    const covered = DECLARATION_ADDITIONNELLE_ORGANISMES.every((o) =>
      declared.includes(o.toLowerCase()),
    );
    checks.push({
      regle: "declaration_additionnelle_ue",
      libelle: "Déclaration Additionnelle UE (organismes de quarantaine)",
      statut:
        !phyto || declared.length === 0 ? "manquant" : covered ? "ok" : "non_conforme",
      message: covered
        ? null
        : `Déclaration additionnelle absente ou incomplète (attendu : ${DECLARATION_ADDITIONNELLE_ORGANISMES.join(", ")}).`,
    });
  }

  // 3) Règlement (UE) 2021/2285 (plants patate douce / slips).
  if (!isSlips(produit)) {
    checks.push({
      regle: "reglement_2021_2285",
      libelle: "Règlement (UE) 2021/2285 (plants destinés à la plantation)",
      statut: "non_applicable",
      message: "Non requis pour ce produit.",
    });
  } else {
    const phyto = findDoc(documents, "phyto");
    const ok = phyto?.metadata.reglement20212285 === true;
    checks.push({
      regle: "reglement_2021_2285",
      libelle: "Règlement (UE) 2021/2285 (plants destinés à la plantation)",
      statut: ok ? "ok" : "non_conforme",
      message: ok
        ? null
        : "Mention de conformité au règlement 2021/2285 absente du phyto.",
    });
  }

  // 4) Code HS correct (bon classement douanier).
  const expectedHs = expectedHsFor(produit);
  const factureHs = findDoc(documents, "facture")?.metadata.codeHs ?? null;
  if (!expectedHs || !factureHs) {
    checks.push({
      regle: "code_hs",
      libelle: "Code HS correct",
      statut: "non_applicable",
      message: !expectedHs
        ? "Aucun code HS de référence pour ce produit."
        : "Code HS absent de la facture.",
    });
  } else {
    const ok = factureHs.replace(/\s/g, "") === expectedHs;
    checks.push({
      regle: "code_hs",
      libelle: "Code HS correct",
      statut: ok ? "ok" : "non_conforme",
      message: ok ? null : `Code HS ${factureHs} inattendu (attendu ${expectedHs}).`,
    });
  }

  // 5) Couverture GGAP / GRASP (certification produit × pays).
  const mangue = /mangue|mango/i.test(produit);
  checks.push({
    regle: "couverture_ggap_grasp",
    libelle: "Couverture GlobalG.A.P. / GRASP",
    statut: mangue ? "non_conforme" : "ok",
    message: mangue ? "Couverture GGAP/GRASP mangue non confirmée." : null,
  });

  // 6) Preuve produit (photo boîte au chargement).
  checks.push({
    regle: "preuve_produit",
    libelle: "Preuve produit (photo au chargement)",
    statut: hasPreuve ? "ok" : "manquant",
    message: hasPreuve ? null : "Aucune preuve produit rattachée au lot.",
  });

  return checks;
}

/** Une anomalie bloque l'expédition si elle est majeure ou critique. */
export function isBlocking(anomalie: Pick<DocAnomaly, "severite">): boolean {
  return anomalie.severite === "majeure" || anomalie.severite === "critique";
}

/**
 * Agrège le statut de la Gate. Tant qu'aucune vérification n'a tourné (aucun
 * check), l'état est `en_attente`. Sinon : `rouge` s'il reste une anomalie
 * bloquante **ou** une règle de conformité en échec, `vert` autrement.
 */
export function computeGateStatus(
  anomalies: Pick<DocAnomaly, "severite">[],
  checks: ConformiteCheck[],
): GateStatut {
  if (checks.length === 0) return "en_attente";
  if (anomalies.some(isBlocking)) return "rouge";
  if (checks.some((c) => c.statut === "manquant" || c.statut === "non_conforme")) {
    return "rouge";
  }
  return "vert";
}
