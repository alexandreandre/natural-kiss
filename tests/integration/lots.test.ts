import { describe, expect, it } from "vitest";

import { getLotByContainer, listLots } from "@/lib/data/lots";

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
});
