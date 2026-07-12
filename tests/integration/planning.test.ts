import { describe, expect, it } from "vitest";

import {
  getDashboardData,
  getPlanningView,
  importPlanningRows,
} from "@/lib/planning/service";
import type { ParsedPlanningRow } from "@/lib/planning/parse";

/**
 * Tests d'intégration Brique 5 contre Supabase LOCAL (`supabase db reset`).
 * ⚠️ L'ordre compte : le test d'import ajoute des lignes `source='import'`,
 * il est donc placé APRÈS les assertions sur le seed.
 */
describe("planning & dashboard (Supabase local, seed)", () => {
  it("réconcilie le planning du seed (5 réalisés, 1 glissement, 3 à venir)", async () => {
    const { lines } = await getPlanningView();
    // On raisonne sur les lignes de démo (source='seed') — indépendamment des
    // éventuelles lignes 'import' laissées par le test d'import ci-dessous.
    const seed = lines.filter((l) => l.source === "seed");
    expect(seed).toHaveLength(9);
    expect(seed.filter((l) => l.etat === "realise")).toHaveLength(5);
    expect(seed.filter((l) => l.etat === "glissement")).toHaveLength(1);
    expect(seed.filter((l) => l.etat === "planifie")).toHaveLength(3);

    // Le lot Bimi rejeté (LOT-2026-0002) était prévu W19 mais parti W20.
    const glissement = seed.find((l) => l.etat === "glissement");
    expect(glissement?.lotReference).toBe("LOT-2026-0002");
    expect(glissement?.ecartSemaines).toBe(1);
  });

  it("calcule les KPIs de service sur les lots (80 % service / 20 % retard)", async () => {
    const data = await getDashboardData();
    expect(data.total).toBeGreaterThanOrEqual(7);
    expect(data.kpis.evalues).toBe(5);
    expect(data.kpis.tauxService).toBeCloseTo(0.8, 5);
    expect(data.kpis.tauxRetard).toBeCloseTo(0.2, 5);
    // Agrégats non vides.
    expect(data.byStatut.length).toBeGreaterThan(0);
    expect(data.byPays.length).toBeGreaterThan(0);
  });

  it("filtre le dashboard par pays (UK) puis par risque", async () => {
    const uk = await getDashboardData({ pays: "UK" });
    expect(uk.lots.every((l) => l.destinationPays === "UK")).toBe(true);
    expect(uk.lots.length).toBeGreaterThan(0);

    const eleve = await getDashboardData({ risque: "eleve" });
    expect(eleve.lots.every((l) => (l.scoreRisque ?? 0) >= 70)).toBe(true);
  });

  it("importe des lignes de planning et rattache le lot réalisé", async () => {
    const parsed: ParsedPlanningRow[] = [
      {
        semaineIso: "2026-W27",
        semaineDebut: "2026-06-29",
        clientNom: "Exo3",
        produit: "Ail",
        variete: null,
        destinationPays: "FR",
        destinationPort: "Marseille",
        quantitePrevue: 18,
        unite: "t",
        lotReference: "MEDU7781204", // n° de conteneur du LOT-2026-0005
      },
      {
        semaineIso: "2026-W32",
        semaineDebut: "2026-08-03",
        clientNom: "Barfoots of Botley Ltd",
        produit: "Tenderstem / Bimi",
        variete: "Inspiration",
        destinationPays: "UK",
        destinationPort: "Trieste → Bognor Regis",
        quantitePrevue: 1200,
        unite: "cartons",
        lotReference: null,
      },
    ];

    const outcome = await importPlanningRows(parsed);
    expect(outcome.inserted).toBe(2);
    expect(outcome.matchedLots).toBe(1); // MEDU7781204 → LOT-2026-0005
    expect(outcome.matchedClients).toBe(2);

    // Ré-import idempotent : ne double pas les lignes 'import'.
    const again = await importPlanningRows(parsed);
    expect(again.inserted).toBe(2);

    const { lines } = await getPlanningView();
    const imported = lines.filter((l) => l.source === "import");
    expect(imported).toHaveLength(2);
  });
});
