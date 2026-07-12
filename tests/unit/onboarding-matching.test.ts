import { describe, expect, it } from "vitest";

import {
  certCovers,
  certificationsExpirantSous,
  matchDemande,
  normalizePays,
  normalizeProduit,
  requiredCertifs,
  type CoffreCert,
} from "@/lib/onboarding/rules";

/**
 * Brique 7 — matching des certifications (logique pure, sans base).
 * Coffre calqué sur le seed : GGAP/GRASP couvrent tout SAUF la mangue ;
 * BRCGS/SMETA/Sedex couvrent l'ensemble ; Sedex proche de l'expiration.
 */
const COFFRE: CoffreCert[] = [
  {
    type: "ggap",
    produits: ["brocoli", "slips", "patate_douce", "ail", "fraise"],
    pays: ["ALL"],
    statut: "valide",
    dateExpiration: "2027-03-31",
  },
  {
    type: "grasp",
    produits: ["brocoli", "slips", "patate_douce", "ail", "fraise"],
    pays: ["ALL"],
    statut: "valide",
    dateExpiration: "2027-03-31",
  },
  {
    type: "brcgs",
    produits: ["ALL"],
    pays: ["ALL"],
    statut: "valide",
    dateExpiration: "2027-01-15",
  },
  {
    type: "smeta",
    produits: ["ALL"],
    pays: ["ALL"],
    statut: "valide",
    dateExpiration: "2026-12-01",
  },
  {
    type: "sedex",
    produits: ["ALL"],
    pays: ["ALL"],
    statut: "valide",
    dateExpiration: "2026-07-25",
  },
];

describe("normalisation", () => {
  it("normalise les familles produit", () => {
    expect(normalizeProduit("Tenderstem / Bimi")).toBe("brocoli");
    expect(normalizeProduit("Mangue")).toBe("mangue");
    expect(normalizeProduit("Plants patate douce (slips)")).toBe("slips");
    expect(normalizeProduit("Sweet potato")).toBe("patate_douce");
  });

  it("normalise les pays (alias → ISO)", () => {
    expect(normalizePays("Royaume-Uni")).toBe("UK");
    expect(normalizePays("uk")).toBe("UK");
    expect(normalizePays("France")).toBe("FR");
    expect(normalizePays("Pays-Bas")).toBe("NL");
  });
});

describe("matrice des certifications requises", () => {
  it("UK exige la base + BRCGS/SMETA/Sedex", () => {
    expect(new Set(requiredCertifs("brocoli", "UK"))).toEqual(
      new Set(["ggap", "grasp", "brcgs", "smeta", "sedex"]),
    );
  });

  it("FR (UE) exige la base + BRCGS, sans SMETA/Sedex", () => {
    const req = new Set(requiredCertifs("patate_douce", "FR"));
    expect(req).toEqual(new Set(["ggap", "grasp", "brcgs"]));
  });
});

describe("couverture d'une certification", () => {
  it("GGAP couvre brocoli mais pas la mangue", () => {
    const ggap = COFFRE[0];
    expect(certCovers(ggap, "brocoli", "UK")).toBe(true);
    expect(certCovers(ggap, "mangue", "UK")).toBe(false);
  });

  it("une certif non valide ne couvre pas", () => {
    const suspendue: CoffreCert = { ...COFFRE[0], statut: "suspendue" };
    expect(certCovers(suspendue, "brocoli", "UK")).toBe(false);
  });
});

describe("matchDemande", () => {
  it("mangue → UK : GGAP/GRASP manquants → insuffisant", () => {
    const res = matchDemande({ produit: "Mangue", pays: "UK", coffre: COFFRE });
    expect(res.decision).toBe("insuffisant");
    const manquants = res.manquantes.map((m) => m.type).sort();
    expect(manquants).toEqual(["ggap", "grasp"]);
    expect(res.raison).toContain("GlobalG.A.P.");
  });

  it("brocoli → UK : toutes couvertes → suffisant", () => {
    const res = matchDemande({
      produit: "Brocoli / Tenderstem",
      pays: "UK",
      coffre: COFFRE,
    });
    expect(res.decision).toBe("suffisant");
    expect(res.manquantes).toHaveLength(0);
    expect(new Set(res.couvertes)).toEqual(
      new Set(["ggap", "grasp", "brcgs", "smeta", "sedex"]),
    );
  });

  it("brocoli → FR : suffisant (base + BRCGS)", () => {
    const res = matchDemande({ produit: "Brocoli", pays: "FR", coffre: COFFRE });
    expect(res.decision).toBe("suffisant");
  });

  it("certif requise absente du coffre → manquante", () => {
    const sansSedex = COFFRE.filter((c) => c.type !== "sedex");
    const res = matchDemande({ produit: "Brocoli", pays: "UK", coffre: sansSedex });
    expect(res.decision).toBe("insuffisant");
    expect(res.manquantes.map((m) => m.type)).toContain("sedex");
  });
});

describe("alertes d'expiration", () => {
  it("détecte une certif proche de l'expiration sous le seuil", () => {
    const now = new Date("2026-07-08T00:00:00Z");
    const alertes = certificationsExpirantSous(COFFRE, 30, now);
    expect(alertes.map((a) => a.type)).toContain("sedex");
    const sedex = alertes.find((a) => a.type === "sedex")!;
    expect(sedex.expiree).toBe(false);
    expect(sedex.joursRestants).toBeGreaterThan(0);
    expect(sedex.joursRestants).toBeLessThanOrEqual(30);
  });

  it("marque une certif dépassée comme expirée", () => {
    const now = new Date("2026-08-01T00:00:00Z");
    const alertes = certificationsExpirantSous(COFFRE, 30, now);
    const sedex = alertes.find((a) => a.type === "sedex")!;
    expect(sedex.expiree).toBe(true);
  });
});
