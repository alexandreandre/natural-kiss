import { describe, expect, it } from "vitest";

import { parseNumber, parsePlanningMatrix } from "@/lib/planning/parse";

describe("parseNumber", () => {
  it("lit les nombres avec séparateurs FR et unités", () => {
    expect(parseNumber("1 200")).toBe(1200);
    expect(parseNumber("2,5")).toBe(2.5);
    expect(parseNumber("18 t")).toBe(18);
    expect(parseNumber("20000")).toBe(20000);
    expect(parseNumber("1.200")).toBe(1200); // séparateur de milliers
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("—")).toBeNull();
  });
});

describe("parsePlanningMatrix", () => {
  const HEADER = [
    "Semaine",
    "Client",
    "Produit",
    "Variété",
    "Destination",
    "Quantité prévue",
    "Unité",
    "Lot",
  ];

  it("parse une matrice avec en-têtes FR", () => {
    const res = parsePlanningMatrix([
      HEADER,
      [
        "2026-W12",
        "Georges Helfer SA",
        "Patate douce",
        "Beauregard",
        "FR",
        "24",
        "t",
        "LOT-2026-0001",
      ],
      [
        "2026-W30",
        "Barfoots",
        "Tenderstem / Bimi",
        "Inspiration",
        "UK",
        "1 200",
        "cartons",
        "",
      ],
    ]);
    expect(res.errors).toHaveLength(0);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0]).toMatchObject({
      semaineIso: "2026-W12",
      semaineDebut: "2026-03-16",
      clientNom: "Georges Helfer SA",
      produit: "Patate douce",
      quantitePrevue: 24,
      unite: "t",
      lotReference: "LOT-2026-0001",
    });
    expect(res.rows[1].quantitePrevue).toBe(1200);
    expect(res.rows[1].lotReference).toBeNull();
  });

  it("tolère les alias d'en-tête (accents, casse, anglais)", () => {
    const res = parsePlanningMatrix([
      ["week", "customer", "product", "pays", "qte"],
      ["2026-W10", "Exo3", "Ail", "FR", "18"],
    ]);
    expect(res.errors).toHaveLength(0);
    expect(res.rows[0]).toMatchObject({
      semaineIso: "2026-W10",
      clientNom: "Exo3",
      produit: "Ail",
      destinationPays: "FR",
      quantitePrevue: 18,
    });
  });

  it("signale clairement l'absence de colonnes obligatoires", () => {
    const res = parsePlanningMatrix([
      ["Client", "Destination", "Quantité"],
      ["Exo3", "FR", "18"],
    ]);
    expect(res.rows).toHaveLength(0);
    expect(res.errors[0].message).toMatch(/obligatoires/i);
  });

  it("ignore les lignes invalides sans casser l'import", () => {
    const res = parsePlanningMatrix([
      HEADER,
      ["2026-W12", "Helfer", "Patate douce", "", "FR", "24", "t", ""],
      ["semaine ???", "Exo3", "Ail", "", "FR", "18", "t", ""], // semaine invalide
      ["2026-W13", "Exo3", "", "", "FR", "18", "t", ""], // produit manquant
    ]);
    expect(res.rows).toHaveLength(1);
    expect(res.errors).toHaveLength(2);
    expect(res.errors.some((e) => /semaine/i.test(e.message))).toBe(true);
    expect(res.errors.some((e) => /produit/i.test(e.message))).toBe(true);
  });

  it("détecte l'en-tête même précédé de lignes de titre", () => {
    const res = parsePlanningMatrix([
      ["Planning export — Natural Kiss", "", ""],
      [],
      HEADER,
      ["2026-W20", "Voltz", "Slips", "Bellevue", "NL", "20000", "slips", ""],
    ]);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].produit).toBe("Slips");
  });
});
