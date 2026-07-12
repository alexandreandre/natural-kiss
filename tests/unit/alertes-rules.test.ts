import { describe, expect, it } from "vitest";

import {
  detectDelayAlert,
  detectExcursionAlert,
  detectMissingDocumentAlert,
  detectQuarantineRiskAlert,
} from "@/lib/alertes/rules";

describe("detectDelayAlert", () => {
  it("aucune alerte sans date d'arrivée prévue", () => {
    expect(
      detectDelayAlert({ statut: "transit", dateArriveePrevue: null, dateArriveeReelle: null }),
    ).toBeNull();
  });

  it("aucune alerte pour un lot encore en booking", () => {
    expect(
      detectDelayAlert({
        statut: "booking",
        dateArriveePrevue: "2026-06-01T00:00:00Z",
        dateArriveeReelle: null,
        now: new Date("2026-06-10T00:00:00Z"),
      }),
    ).toBeNull();
  });

  it("arrivée réelle bien après l'ETA → alerte (cas Bimi RoRo fatigué)", () => {
    const alert = detectDelayAlert({
      statut: "rejete",
      dateArriveePrevue: "2026-05-30T10:00:00+01:00",
      dateArriveeReelle: "2026-06-01T10:00:00+01:00",
    });
    expect(alert).not.toBeNull();
    expect(alert?.type).toBe("retard_navire");
    expect(alert?.severite).toBe("critique");
  });

  it("lot toujours en transit, ETA dépassée de peu → pas d'alerte (tolérance)", () => {
    const now = new Date("2026-06-01T18:00:00Z");
    expect(
      detectDelayAlert({
        statut: "transit",
        dateArriveePrevue: "2026-06-01T10:00:00Z",
        dateArriveeReelle: null,
        now,
      }),
    ).toBeNull();
  });

  it("lot toujours en transit, ETA dépassée largement → alerte", () => {
    const now = new Date("2026-06-03T10:00:00Z");
    const alert = detectDelayAlert({
      statut: "transit",
      dateArriveePrevue: "2026-06-01T10:00:00Z",
      dateArriveeReelle: null,
      now,
    });
    expect(alert).not.toBeNull();
    expect(alert?.severite).toBe("critique");
  });
});

describe("detectExcursionAlert", () => {
  it("aucune consigne / aucun relevé → pas d'alerte", () => {
    expect(detectExcursionAlert({ targetTempC: null, readings: [{ tempC: 20 }] })).toBeNull();
    expect(detectExcursionAlert({ targetTempC: 6, readings: [] })).toBeNull();
  });

  it("relevés dans la tolérance → pas d'alerte", () => {
    expect(
      detectExcursionAlert({
        targetTempC: 6,
        readings: [{ tempC: 6.5 }, { tempC: 5.2 }, { tempC: 7.5 }],
      }),
    ).toBeNull();
  });

  it("excursion marquée (lot Bimi RoRo 'fatigué', consigne -0.5°C) → critique", () => {
    const readings = Array.from({ length: 10 }, (_, i) => ({ tempC: i < 5 ? -0.6 : 9 }));
    const alert = detectExcursionAlert({ targetTempC: -0.5, readings });
    expect(alert).not.toBeNull();
    expect(alert?.type).toBe("excursion_temperature");
    expect(alert?.severite).toBe("critique");
  });
});

describe("detectMissingDocumentAlert", () => {
  it("aucun document manquant → pas d'alerte", () => {
    expect(detectMissingDocumentAlert({ missing: [] })).toBeNull();
  });

  it("documents manquants → alerte avec le détail", () => {
    const alert = detectMissingDocumentAlert({ missing: ["phyto", "bl"] });
    expect(alert?.type).toBe("document_manquant");
    expect(alert?.message).toContain("phyto");
  });
});

describe("detectQuarantineRiskAlert", () => {
  it("aucune règle en échec → pas d'alerte", () => {
    expect(detectQuarantineRiskAlert({ failingRules: [] })).toBeNull();
  });

  it("Déclaration Additionnelle manquante (cas slips Voltz) → alerte critique", () => {
    const alert = detectQuarantineRiskAlert({
      failingRules: [
        { regle: "declaration_additionnelle_ue", libelle: "Déclaration Additionnelle UE" },
      ],
    });
    expect(alert?.type).toBe("risque_quarantaine");
    expect(alert?.severite).toBe("critique");
  });
});
