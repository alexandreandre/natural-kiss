import { describe, expect, it } from "vitest";

import { MODULES, STRATE_ORDER, isModuleEnabled, modulesByStrate } from "@/lib/modules";

describe("registre des modules", () => {
  it("déclare des identifiants uniques", () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("couvre les 4 strates de l'architecture", () => {
    for (const strate of STRATE_ORDER) {
      expect(modulesByStrate(strate).length).toBeGreaterThan(0);
    }
    const covered = new Set(MODULES.map((m) => m.strate));
    expect([...covered].sort()).toEqual([...STRATE_ORDER].sort());
  });

  it("active les modules des briques livrées (jusqu'à la Brique 8 : Cropwise M0b, finance M10, copilot T4, alertes T5)", () => {
    const enabled = MODULES.filter(isModuleEnabled).map((m) => m.id);
    expect(enabled).toEqual([
      "M0",
      "M0b",
      "M0c",
      "M1",
      "M2",
      "M3",
      "M4",
      "M5",
      "M6",
      "M7",
      "M8",
      "M9",
      "M10",
      "T1",
      "T2",
      "T3",
      "T4",
      "T5",
    ]);
  });

  it("chaque module pointe vers une brique et un flag", () => {
    for (const m of MODULES) {
      expect(m.brique).toBeGreaterThanOrEqual(0);
      expect(m.flag).toBeTruthy();
      expect(m.key).toBeTruthy();
    }
  });
});
