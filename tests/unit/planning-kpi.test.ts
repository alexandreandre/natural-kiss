import { describe, expect, it } from "vitest";

import {
  arrivalDelayDays,
  computeServiceKpis,
  reconcilePlanningLine,
  summarizePlanning,
  type PlanningEtat,
} from "@/lib/planning/kpi";
import { isoWeekFromDate, mondayOfIsoWeek, parseSemaine } from "@/lib/planning/week";

// Jeu de données CONNU (calqué sur le seed) : 5 lots arrivés dont 1 en retard,
// + 2 lots non encore arrivés (exclus). Attendu : service 80 %, retard 20 %.
const LOTS = [
  {
    dateArriveePrevue: "2026-03-23T07:00:00+01:00",
    dateArriveeReelle: "2026-03-23T09:30:00+01:00",
  }, // à l'heure (même jour)
  {
    dateArriveePrevue: "2026-04-16T10:00:00+01:00",
    dateArriveeReelle: "2026-04-16T12:00:00+01:00",
  }, // à l'heure
  {
    dateArriveePrevue: "2026-05-16T02:30:00+02:00",
    dateArriveeReelle: "2026-05-16T02:40:00+02:00",
  }, // à l'heure
  {
    dateArriveePrevue: "2026-01-07T07:00:00+01:00",
    dateArriveeReelle: "2026-01-07T07:30:00+01:00",
  }, // à l'heure
  {
    dateArriveePrevue: "2026-05-30T10:00:00+01:00",
    dateArriveeReelle: "2026-06-01T10:00:00+01:00",
  }, // RETARD (2 j)
  { dateArriveePrevue: "2026-07-10T08:00:00+02:00", dateArriveeReelle: null }, // en transit → exclu
  { dateArriveePrevue: "2026-06-30T08:00:00+03:00", dateArriveeReelle: null }, // booking → exclu
];

describe("computeServiceKpis", () => {
  it("calcule taux de service / retard sur les lots arrivés (80 % / 20 %)", () => {
    const kpis = computeServiceKpis(LOTS);
    expect(kpis.evalues).toBe(5);
    expect(kpis.aLheure).toBe(4);
    expect(kpis.enRetard).toBe(1);
    expect(kpis.tauxService).toBeCloseTo(0.8, 5);
    expect(kpis.tauxRetard).toBeCloseTo(0.2, 5);
    expect(kpis.retardMoyenJours).toBeCloseTo(2, 5);
  });

  it("gère l'absence de lots évalués", () => {
    const kpis = computeServiceKpis([
      { dateArriveePrevue: "2026-01-01", dateArriveeReelle: null },
    ]);
    expect(kpis.evalues).toBe(0);
    expect(kpis.tauxService).toBe(0);
    expect(kpis.tauxRetard).toBe(0);
    expect(kpis.retardMoyenJours).toBe(0);
  });
});

describe("arrivalDelayDays", () => {
  it("compte le retard au jour près (tolérant aux heures)", () => {
    expect(
      arrivalDelayDays("2026-03-23T07:00:00+01:00", "2026-03-23T23:00:00+01:00"),
    ).toBe(0);
    expect(arrivalDelayDays("2026-05-30", "2026-06-01")).toBe(2);
    expect(arrivalDelayDays("2026-05-30", "2026-05-28")).toBe(-2);
    expect(arrivalDelayDays(null, "2026-06-01")).toBeNull();
  });
});

describe("semaine ISO", () => {
  it("dérive la semaine ISO d'une date", () => {
    expect(isoWeekFromDate("2026-03-16")?.iso).toBe("2026-W12");
    expect(isoWeekFromDate("2026-03-16")?.monday).toBe("2026-03-16");
    expect(isoWeekFromDate("2026-01-07")?.iso).toBe("2026-W02");
    expect(isoWeekFromDate("2026-05-16")?.iso).toBe("2026-W20");
  });

  it("calcule le lundi d'une semaine ISO (semaine 1 = début janvier)", () => {
    expect(mondayOfIsoWeek(2026, 1)).toBe("2025-12-29");
    expect(mondayOfIsoWeek(2026, 12)).toBe("2026-03-16");
  });

  it("normalise différentes écritures de semaine", () => {
    expect(parseSemaine("2026-W12", 2026)?.iso).toBe("2026-W12");
    expect(parseSemaine("W12", 2026)?.iso).toBe("2026-W12");
    expect(parseSemaine("12", 2026)?.iso).toBe("2026-W12");
    expect(parseSemaine("2026-03-16", 2026)?.iso).toBe("2026-W12");
    expect(parseSemaine("16/03/2026", 2026)?.iso).toBe("2026-W12");
    expect(parseSemaine("n'importe quoi", 2026)).toBeNull();
  });
});

describe("réconciliation prévu / réalisé", () => {
  it("classe une ligne sans lot en « planifié »", () => {
    const r = reconcilePlanningLine({ semaineIso: "2026-W28", lot: null });
    expect(r.etat).toBe("planifie");
  });

  it("classe un départ à la semaine prévue en « réalisé »", () => {
    const r = reconcilePlanningLine({
      semaineIso: "2026-W12",
      lot: { dateDepart: "2026-03-16T22:00:00+02:00" },
    });
    expect(r.etat).toBe("realise");
    expect(r.ecartSemaines).toBe(0);
  });

  it("détecte un « glissement » et son écart en semaines", () => {
    const r = reconcilePlanningLine({
      semaineIso: "2026-W19",
      lot: { dateDepart: "2026-05-16T23:30:00+02:00" }, // parti en W20
    });
    expect(r.etat).toBe("glissement");
    expect(r.semaineReelleIso).toBe("2026-W20");
    expect(r.ecartSemaines).toBe(1);
  });

  it("agrège les états en indicateurs de synthèse", () => {
    const etats: PlanningEtat[] = [
      "realise",
      "realise",
      "realise",
      "realise",
      "realise",
      "glissement",
      "planifie",
      "planifie",
      "planifie",
    ];
    const s = summarizePlanning(etats);
    expect(s.total).toBe(9);
    expect(s.realise).toBe(5);
    expect(s.glissement).toBe(1);
    expect(s.planifie).toBe(3);
    expect(s.parti).toBe(6);
    expect(s.tauxRealisation).toBeCloseTo(6 / 9, 5);
    expect(s.ponctualiteDepart).toBeCloseTo(5 / 6, 5);
  });
});
