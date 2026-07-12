import { describe, expect, it } from "vitest";

import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";

describe("feature flags", () => {
  it("le socle (référentiel) est actif", () => {
    expect(isFeatureEnabled("REFERENTIEL")).toBe(true);
  });

  it("le suivi conteneur (M7) est actif depuis la Brique 1", () => {
    expect(isFeatureEnabled("TRACKING")).toBe(true);
  });

  it("la Gate documentaire (M6) est active depuis la Brique 3", () => {
    expect(isFeatureEnabled("GATE")).toBe(true);
  });

  it("le portail client (M5/T1) est actif depuis la Brique 4", () => {
    expect(isFeatureEnabled("PORTAIL")).toBe(true);
  });

  it("le dashboard & planning (T3/M3) est actif depuis la Brique 5", () => {
    expect(isFeatureEnabled("DASHBOARD")).toBe(true);
  });

  it("le hub email & qualité (T2/M9) est actif depuis la Brique 6", () => {
    expect(isFeatureEnabled("EMAIL_HUB")).toBe(true);
  });

  it("la demande & onboarding (M1/M2/M0c) est active depuis la Brique 7", () => {
    expect(isFeatureEnabled("ONBOARDING")).toBe(true);
  });

  it("la complétude du flux (M0b/M10/T4/T5) est active depuis la Brique 8", () => {
    expect(isFeatureEnabled("COMPLETUDE")).toBe(true);
  });

  it("le booking (M4) est actif depuis la Brique 9", () => {
    expect(isFeatureEnabled("BOOKING")).toBe(true);
  });

  it("expose une valeur booléenne pour chaque flag déclaré", () => {
    for (const key of Object.keys(FEATURE_FLAGS) as (keyof typeof FEATURE_FLAGS)[]) {
      expect(typeof isFeatureEnabled(key)).toBe("boolean");
    }
  });
});
