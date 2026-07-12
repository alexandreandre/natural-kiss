import { describe, expect, it } from "vitest";

import { preuveObjectKey } from "@/lib/portail/paths";

/**
 * Brique 4 — normalisation des clés Storage `preuves`. Le portail et l'interne
 * doivent produire la même clé d'objet quelle que soit la forme du `storage_path`
 * (avec ou sans préfixe de bucket) pour générer une URL signée valide.
 */
describe("preuveObjectKey", () => {
  it("retire le préfixe de bucket historique", () => {
    expect(preuveObjectKey("preuves/LOT-2026-0003/boite.jpg")).toBe(
      "LOT-2026-0003/boite.jpg",
    );
  });

  it("laisse intacte une clé déjà sans préfixe (uploads applicatifs)", () => {
    expect(preuveObjectKey("LOT-2026-0002/photo_boite-123-x.jpg")).toBe(
      "LOT-2026-0002/photo_boite-123-x.jpg",
    );
  });

  it("ne retire qu'un préfixe en tête", () => {
    expect(preuveObjectKey("LOT/preuves/x.jpg")).toBe("LOT/preuves/x.jpg");
  });
});
