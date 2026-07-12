import { describe, expect, it } from "vitest";

import { runAlertScan } from "@/lib/alertes/service";
import { getLotByContainer } from "@/lib/data/lots";
import { getLotFinance } from "@/lib/finance/service";
import { runGateCheck } from "@/lib/gate/service";
import { syncLotOrigin } from "@/lib/origines/service";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Brique 8 — Complétude du flux contre Supabase (données de seed) :
 *   • M0b : le connecteur Cropwise (mock) rattache un lot à son origine ;
 *   • M10 : un litige non résolu (cas Voltz) prime sur le statut de paiement ;
 *   • T5 : l'excursion de température (lot Bimi RoRo « fatigué ») génère une alerte.
 */
describe("Complétude du flux (Supabase, données de seed)", () => {
  it("M0b — le connecteur Cropwise rattache le lot à son site (idempotent)", async () => {
    const lot = await getLotByContainer("MEDU7781204");
    expect(lot).not.toBeNull();

    await syncLotOrigin(lot!.id);
    await syncLotOrigin(lot!.id); // rejouable sans dupliquer (upsert lot_id+ref)

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("origines")
      .select("site, ref")
      .eq("lot_id", lot!.id);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.site).toBe("El Saada — Ismailia");
  });

  it("M10 — le litige Voltz (facture contestée) fait passer le paiement en litige", async () => {
    const lot = await getLotByContainer("OTPU6220580");
    expect(lot).not.toBeNull();

    const finance = await getLotFinance(lot!.id);
    expect(finance.paiement.statut).toBe("litige");
    expect(finance.litiges.some((l) => l.type === "facture_contestee")).toBe(true);
  });

  it("T5 — excursion de température (lot Bimi RoRo « fatigué ») → alerte critique", async () => {
    const lot = await getLotByContainer("OLMP2605160");
    expect(lot).not.toBeNull();

    const candidates = await runAlertScan(lot!.id);
    const excursion = candidates.find((c) => c.type === "excursion_temperature");
    expect(excursion).toBeDefined();
    expect(excursion?.severite).toBe("critique");

    const supabase = createAdminClient();
    const { data } = await supabase
      .from("alertes")
      .select("statut")
      .eq("lot_id", lot!.id)
      .eq("type", "excursion_temperature")
      .maybeSingle();
    expect(data?.statut).toBe("active");
  });

  it("T5 — risque de quarantaine détecté après la Gate (slips Voltz, DA manquante)", async () => {
    const lot = await getLotByContainer("OTPU6220580");
    expect(lot).not.toBeNull();

    await runGateCheck(lot!.id);
    const candidates = await runAlertScan(lot!.id);
    expect(candidates.some((c) => c.type === "risque_quarantaine")).toBe(true);
  });
});
