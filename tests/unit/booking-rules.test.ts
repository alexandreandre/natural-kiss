import { describe, expect, it } from "vitest";

import {
  generateDossierText,
  nextLotReference,
  parseLotSeq,
} from "@/lib/booking/rules";

/**
 * Brique 9 — règles pures du booking (dossier standardisé + référence de lot).
 */

describe("generateDossierText", () => {
  it("produit un brief standardisé peu importe le canal de destination", () => {
    const texte = generateDossierText({
      clientNom: "Barfoots of Botley Ltd",
      produit: "Tenderstem / Bimi",
      variete: "Inspiration",
      quantite: 1200,
      unite: "cartons",
      incoterm: "DAP",
      destinationPays: "UK",
      destinationPort: "Bognor Regis",
      mode: "roro",
      dateSouhaitee: "2026-07-17",
    });

    expect(texte).toContain("Barfoots of Botley Ltd");
    expect(texte).toContain("Tenderstem / Bimi (Inspiration)");
    expect(texte).toContain("1200 cartons");
    expect(texte).toContain("DAP");
    expect(texte).toContain("Bognor Regis, UK");
    expect(texte).toContain("RoRo");
    expect(texte).toContain("2026-07-17");
    expect(texte).toContain("Merci de confirmer");
  });

  it("omet les champs absents sans planter", () => {
    const texte = generateDossierText({
      clientNom: "Exo3",
      produit: "Ail",
      variete: null,
      quantite: null,
      unite: null,
      incoterm: null,
      destinationPays: null,
      destinationPort: null,
      mode: "sea",
      dateSouhaitee: null,
    });

    expect(texte).toContain("Exo3");
    expect(texte).toContain("Ail");
    expect(texte).not.toContain("Incoterm");
    expect(texte).not.toContain("Quantité");
    expect(texte).not.toContain("Destination :");
  });
});

describe("nextLotReference / parseLotSeq", () => {
  it("génère la référence suivante à partir du dernier numéro connu", () => {
    expect(nextLotReference(2026, 0)).toBe("LOT-2026-0001");
    expect(nextLotReference(2026, 7)).toBe("LOT-2026-0008");
  });

  it("extrait le numéro de séquence d'une référence de l'année donnée", () => {
    expect(parseLotSeq("LOT-2026-0007", 2026)).toBe(7);
    expect(parseLotSeq("LOT-2025-0007", 2026)).toBe(0);
    expect(parseLotSeq("AUTRE-REF", 2026)).toBe(0);
  });
});
