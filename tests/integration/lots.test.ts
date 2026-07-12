import { describe, expect, it } from "vitest";

import {
  getLotById,
  getLotByContainer,
  getLotDetailSections,
  listLots,
  listLotsFiltered,
} from "@/lib/data/lots";

/**
 * Tests d'intégration contre Supabase LOCAL (`supabase start` + `supabase db reset`).
 * Valident que le socle M0 + le seed sont lisibles via le client typé.
 */
describe("lots (Supabase local, données de seed)", () => {
  it("lit les lots de démo", async () => {
    const lots = await listLots(50);
    expect(lots.length).toBeGreaterThanOrEqual(7);
    // Le client est bien joint (RLS contournée via service role).
    expect(lots.every((l) => typeof l.reference === "string")).toBe(true);
  });

  it("retrouve un lot par n° de conteneur (CAAU4027760 → Georges Helfer)", async () => {
    const lot = await getLotByContainer("CAAU4027760");
    expect(lot).not.toBeNull();
    expect(lot?.produit).toContain("Patate douce");
    expect(lot?.clientNom).toContain("Helfer");
  });

  it("contient les cas « à problème » attendus", async () => {
    const lots = await listLots(50);

    // Lot maritime "fatigué" rejeté, score de risque élevé.
    const fatigue = lots.find((l) => l.numeroConteneur === "OLMP2605160");
    expect(fatigue?.statut).toBe("rejete");
    expect(fatigue?.scoreRisque ?? 0).toBeGreaterThanOrEqual(80);

    // Conteneur incohérent / phyto incomplet (slips Voltz).
    const incoherent = lots.find((l) => l.numeroConteneur === "OTPU6220580");
    expect(incoherent).toBeDefined();
    expect(incoherent?.destinationPays).toBe("NL");
  });

  it("filtre les lots par statut (Brique 2)", async () => {
    const rejetes = await listLotsFiltered({ statut: "rejete" });
    expect(rejetes.length).toBeGreaterThanOrEqual(1);
    expect(rejetes.every((l) => l.statut === "rejete")).toBe(true);
  });

  it("trie par risque décroissant (les lots à surveiller d'abord)", async () => {
    const lots = await listLotsFiltered();
    const scores = lots.map((l) => l.scoreRisque ?? 0);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
  });

  it("charge une fiche lot 360° par id, avec ses sections", async () => {
    const [first] = await listLotsFiltered({ statut: "rejete" });
    expect(first).toBeDefined();

    const lot = await getLotById(first!.id);
    expect(lot?.reference).toBe(first!.reference);

    const sections = await getLotDetailSections(first!.id);
    // Le lot Bimi rejeté porte un rapport qualité (retour client) dans le seed.
    expect(sections.qualite.length).toBeGreaterThanOrEqual(1);
  });
});
