import { describe, expect, it } from "vitest";

import { getLotByContainer } from "@/lib/data/lots";
import { getGateData, runGateCheck } from "@/lib/gate/service";

/**
 * Brique 3 — Gate « Check OK » contre Supabase (données de seed).
 * Vérifie le flux complet : vérification → anomalies/conformité → statut → mail.
 */
describe("Gate (Supabase, données de seed)", () => {
  it("jeu incohérent (slips OTPU6220580) → anomalies + Gate rouge", async () => {
    const lot = await getLotByContainer("OTPU6220580");
    expect(lot).not.toBeNull();

    const res = await runGateCheck(lot!.id);
    expect(res.statut).toBe("rouge");
    expect(res.anomalies.some((a) => a.code === "conteneur_incoherent")).toBe(true);

    const data = await getGateData(lot!.id);
    expect(data.statut).toBe("rouge");
    expect(data.anomalies.length).toBeGreaterThan(0);
    expect(
      data.conformite.some(
        (c) => c.regle === "declaration_additionnelle_ue" && c.statut === "manquant",
      ),
    ).toBe(true);
  });

  it("jeu cohérent (Bimi TCLU4239771) → Gate verte + mail tracé", async () => {
    const lot = await getLotByContainer("TCLU4239771");
    expect(lot).not.toBeNull();

    const res = await runGateCheck(lot!.id);
    expect(res.statut).toBe("vert");

    const data = await getGateData(lot!.id);
    expect(data.statut).toBe("vert");
    expect(data.mailEnvoye).toBe(true);
    expect(data.journal.some((j) => j.evenement === "mail_envoye")).toBe(true);
  });
});
