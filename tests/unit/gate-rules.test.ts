import { describe, expect, it } from "vitest";

import { crossCheckDocuments } from "@/lib/adapters/mock";
import type { VerifierDoc } from "@/lib/adapters/types";
import { computeGateStatus, evaluateConformite } from "@/lib/gate/rules";

/**
 * Brique 3 — règles de cohérence & conformité (logique pure, testable).
 */

// Jeu COHÉRENT (Bimi #4, UK) — n° conteneur, poids, HS alignés.
const COHERENT: VerifierDoc[] = [
  {
    id: "1",
    type: "facture",
    nomFichier: "inv.pdf",
    metadata: {
      numeroConteneur: "TCLU4239771",
      codeHs: "07041000",
      poidsBrutKg: 5200,
      quantite: 800,
    },
  },
  {
    id: "2",
    type: "bl",
    nomFichier: "bl.pdf",
    metadata: { numeroConteneur: "TCLU4239771", poidsBrutKg: 5200, quantite: 800 },
  },
  {
    id: "3",
    type: "phyto",
    nomFichier: "phyto.pdf",
    metadata: {
      numeroConteneur: "TCLU4239771",
      declarationAdditionnelle: [
        "Thrips palmi",
        "Bemisia tabaci",
        "Liriomyza sativae",
        "Nemorimyza maculosa",
      ],
    },
  },
  {
    id: "4",
    type: "packing_list",
    nomFichier: "pl.pdf",
    metadata: { numeroConteneur: "TCLU4239771", poidsBrutKg: 5200, quantite: 800 },
  },
];

// Jeu INCOHÉRENT (slips Voltz, NL) — conteneur divergent, poids divergent, HS erroné, DA absente.
const INCOHERENT: VerifierDoc[] = [
  {
    id: "1",
    type: "facture",
    nomFichier: "inv.pdf",
    metadata: {
      numeroConteneur: "OTPU6220580",
      codeHs: "07142000",
      poidsBrutKg: 520,
      quantite: 20000,
    },
  },
  {
    id: "2",
    type: "bl",
    nomFichier: "bl.pdf",
    metadata: { numeroConteneur: "OTPU6220589", poidsBrutKg: 520, quantite: 20000 },
  },
  {
    id: "3",
    type: "phyto",
    nomFichier: "phyto.pdf",
    metadata: {
      numeroConteneur: "OTPU6220580",
      declarationAdditionnelle: [],
      reglement20212285: false,
    },
  },
  {
    id: "4",
    type: "packing_list",
    nomFichier: "pl.pdf",
    metadata: { numeroConteneur: "OTPU6220580", poidsBrutKg: 560, quantite: 20000 },
  },
];

describe("crossCheckDocuments (cohérence croisée)", () => {
  it("ne signale rien sur un jeu cohérent", () => {
    expect(crossCheckDocuments(COHERENT)).toEqual([]);
  });

  it("détecte le n° de conteneur incohérent (critique)", () => {
    const anomalies = crossCheckDocuments(INCOHERENT);
    const conteneur = anomalies.find((a) => a.code === "conteneur_incoherent");
    expect(conteneur).toBeDefined();
    expect(conteneur?.severite).toBe("critique");
    expect(conteneur?.message).toContain("OTPU6220589");
  });

  it("détecte le poids brut incohérent (majeure)", () => {
    const anomalies = crossCheckDocuments(INCOHERENT);
    const poids = anomalies.find((a) => a.code === "poids_incoherent");
    expect(poids?.severite).toBe("majeure");
  });
});

describe("evaluateConformite (checklist pays / produit)", () => {
  it("jeu cohérent (UK, Bimi) → aucune règle en échec", () => {
    const checks = evaluateConformite({
      produit: "Tenderstem / Bimi",
      destinationPays: "UK",
      documents: COHERENT,
      hasPreuve: true,
    });
    expect(
      checks.some((c) => c.statut === "manquant" || c.statut === "non_conforme"),
    ).toBe(false);
  });

  it("jeu incohérent (NL, slips) → Déclaration Additionnelle manquante + HS non conforme + preuve manquante", () => {
    const checks = evaluateConformite({
      produit: "Plants patate douce (slips)",
      destinationPays: "NL",
      documents: INCOHERENT,
      hasPreuve: false,
    });
    const byRegle = Object.fromEntries(checks.map((c) => [c.regle, c.statut]));
    expect(byRegle["declaration_additionnelle_ue"]).toBe("manquant");
    expect(byRegle["code_hs"]).toBe("non_conforme");
    expect(byRegle["preuve_produit"]).toBe("manquant");
  });
});

describe("computeGateStatus", () => {
  it("aucun check → en_attente", () => {
    expect(computeGateStatus([], [])).toBe("en_attente");
  });

  it("jeu cohérent → vert", () => {
    const checks = evaluateConformite({
      produit: "Tenderstem / Bimi",
      destinationPays: "UK",
      documents: COHERENT,
      hasPreuve: true,
    });
    expect(computeGateStatus(crossCheckDocuments(COHERENT), checks)).toBe("vert");
  });

  it("anomalie bloquante → rouge", () => {
    const checks = evaluateConformite({
      produit: "Tenderstem / Bimi",
      destinationPays: "UK",
      documents: COHERENT,
      hasPreuve: true,
    });
    expect(computeGateStatus([{ severite: "critique" }], checks)).toBe("rouge");
  });
});
