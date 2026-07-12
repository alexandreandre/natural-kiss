import { describe, expect, it } from "vitest";

import { getSensorProvider, getTrackingProvider } from "@/lib/adapters";
import { bandForScore, computeArrivalRisk } from "@/lib/tracking/risk";

// Scénario "sain" : patate douce → Marseille (CAAU4027760).
const HEALTHY = {
  mode: "sea" as const,
  targetTempC: 6,
  harvestDate: "2026-03-08",
  departureAt: "2026-03-16T22:00:00+02:00",
  arrivalAt: "2026-03-23T07:00:00+01:00",
  readings: Array.from({ length: 24 }, (_, i) => ({
    at: new Date(2026, 2, 16 + i * 0.3).toISOString(),
    tempC: 6 + (i % 2 === 0 ? 0.3 : -0.3),
  })),
};

describe("computeArrivalRisk — bandes", () => {
  it("classe les scores dans les bonnes bandes", () => {
    expect(bandForScore(10)).toBe("faible");
    expect(bandForScore(39)).toBe("faible");
    expect(bandForScore(40)).toBe("moyen");
    expect(bandForScore(69)).toBe("moyen");
    expect(bandForScore(70)).toBe("eleve");
    expect(bandForScore(100)).toBe("eleve");
  });
});

describe("computeArrivalRisk — logique", () => {
  it("donne un risque faible pour un lot sain (froid respecté, transit court)", () => {
    const risk = computeArrivalRisk(HEALTHY);
    expect(risk.score).toBeLessThan(40);
    expect(risk.band).toBe("faible");
    // Pas d'excursion → facteur température nul.
    const excursion = risk.factors.find((f) => f.key === "excursion");
    expect(excursion?.points).toBe(0);
  });

  it("borne le score entre 0 et 100", () => {
    const extreme = computeArrivalRisk({
      mode: "roro",
      targetTempC: -0.5,
      harvestDate: "2026-01-01",
      departureAt: "2026-02-01T00:00:00Z",
      arrivalAt: "2026-03-01T00:00:00Z",
      readings: [{ at: "2026-02-15T00:00:00Z", tempC: 40 }],
    });
    expect(extreme.score).toBeLessThanOrEqual(100);
    expect(extreme.score).toBeGreaterThanOrEqual(0);
  });

  it("ignore les facteurs sans donnée (pas de récolte, pas de mesure)", () => {
    const risk = computeArrivalRisk({
      mode: "air",
      targetTempC: null,
      harvestDate: null,
      departureAt: "2026-05-15T22:00:00+02:00",
      arrivalAt: "2026-05-16T02:30:00+02:00",
      readings: [],
    });
    expect(risk.factors.find((f) => f.key === "harvestAge")?.points).toBe(0);
    expect(risk.factors.find((f) => f.key === "excursion")?.points).toBe(0);
  });
});

describe("computeArrivalRisk — intégration avec les adaptateurs mock", () => {
  it("le lot maritime « fatigué » (OLMP2605160) affiche un risque élevé", async () => {
    const tracking = getTrackingProvider();
    const sensor = getSensorProvider();
    const events = await tracking.getTimeline("OLMP2605160");
    const readings = await sensor.getSeries("OLMP2605160");

    const departure = events.find((e) => e.code === "departure")?.at ?? events[0]?.at;
    const arrival =
      [...events].reverse().find((e) => e.code === "arrival")?.at ??
      events[events.length - 1]?.at;

    const risk = computeArrivalRisk({
      mode: "roro",
      targetTempC: -0.5,
      harvestDate: "2026-05-04",
      departureAt: departure,
      arrivalAt: arrival,
      readings: readings.map((r) => ({ at: r.at, tempC: r.tempC })),
    });

    expect(risk.band).toBe("eleve");
    expect(risk.score).toBeGreaterThanOrEqual(70);
  });
});
