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

  it("n'active que le référentiel (M0) en Brique 0", () => {
    const enabled = MODULES.filter(isModuleEnabled).map((m) => m.id);
    expect(enabled).toEqual(["M0"]);
  });

  it("chaque module pointe vers une brique et un flag", () => {
    for (const m of MODULES) {
      expect(m.brique).toBeGreaterThanOrEqual(0);
      expect(m.flag).toBeTruthy();
      expect(m.key).toBeTruthy();
    }
  });
});
