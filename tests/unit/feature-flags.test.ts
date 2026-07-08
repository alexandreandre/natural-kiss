import { describe, expect, it } from "vitest";

import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";

describe("feature flags", () => {
  it("le socle (référentiel) est actif en Brique 0", () => {
    expect(isFeatureEnabled("REFERENTIEL")).toBe(true);
  });

  it("les modules des briques suivantes sont désactivés par défaut", () => {
    expect(isFeatureEnabled("TRACKING")).toBe(false);
    expect(isFeatureEnabled("GATE")).toBe(false);
    expect(isFeatureEnabled("PORTAIL")).toBe(false);
  });

  it("expose une valeur booléenne pour chaque flag déclaré", () => {
    for (const key of Object.keys(FEATURE_FLAGS) as (keyof typeof FEATURE_FLAGS)[]) {
      expect(typeof isFeatureEnabled(key)).toBe("boolean");
    }
  });
});
