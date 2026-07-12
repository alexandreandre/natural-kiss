import { afterAll, describe, expect, it } from "vitest";

import { confirmBooking, createDemandeBooking } from "@/lib/booking/service";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Brique 9 — Booking (M4) contre Supabase : dossier de réservation → point
 * d'entrée unique de confirmation → création du lot. Nettoie tout ce qui est créé.
 */
const RUN = Date.now();

// Clients du seed (Brique 0) — réutilisés pour ne pas polluer le référentiel client.
const BARFOOTS_ID = "b0000000-0000-4000-8000-000000000001";
const EXO3_ID = "b0000000-0000-4000-8000-000000000004";

const created = {
  demandeIds: [] as string[],
  lotIds: [] as string[],
  transporteurIds: [] as string[],
};

afterAll(async () => {
  const supabase = createAdminClient();
  for (const id of created.demandeIds) {
    await supabase.from("demandes_booking").delete().eq("id", id);
  }
  for (const id of created.lotIds) {
    await supabase.from("lots").delete().eq("id", id);
  }
  for (const id of created.transporteurIds) {
    await supabase.from("transporteurs").delete().eq("id", id);
  }
});

describe("Booking (Supabase)", () => {
  it("crée un dossier brouillon avec le dossier de réservation généré", async () => {
    const demande = await createDemandeBooking({
      clientId: BARFOOTS_ID,
      produit: `Test Produit ${RUN}`,
      mode: "roro",
      destinationPays: "UK",
    });
    created.demandeIds.push(demande.id);

    expect(demande.statut).toBe("brouillon");
    expect(demande.clientNom).toBe("Barfoots of Botley Ltd");
    expect(demande.dossierTexte).toContain("Barfoots of Botley Ltd");
    expect(demande.dossierTexte).toContain(`Test Produit ${RUN}`);
    expect(demande.lotId).toBeNull();
  });

  it("confirme depuis un dossier existant : crée le lot, idempotent", async () => {
    const demande = await createDemandeBooking({
      clientId: EXO3_ID,
      produit: `Test Ail ${RUN}`,
      mode: "sea",
      destinationPays: "FR",
    });
    created.demandeIds.push(demande.id);

    const result = await confirmBooking({
      demandeId: demande.id,
      numeroConteneur: `TESTCTR${RUN}A`,
      transporteurNom: "MSC / Borchard", // transporteur déjà au référentiel (seed)
      dateDepart: "2026-09-01",
    });
    created.lotIds.push(result.lotId);

    expect(result.lotReference).toMatch(/^LOT-\d{4}-\d{4}$/);

    const supabase = createAdminClient();
    const { data: lot } = await supabase
      .from("lots")
      .select("statut, numero_conteneur, client_id, produit, mode")
      .eq("id", result.lotId)
      .single();
    expect(lot?.statut).toBe("booking");
    expect(lot?.numero_conteneur).toBe(`TESTCTR${RUN}A`);
    expect(lot?.client_id).toBe(EXO3_ID);
    expect(lot?.produit).toBe(`Test Ail ${RUN}`);

    const { data: demandeAfter } = await supabase
      .from("demandes_booking")
      .select("statut, lot_id")
      .eq("id", demande.id)
      .single();
    expect(demandeAfter?.statut).toBe("confirme");
    expect(demandeAfter?.lot_id).toBe(result.lotId);

    // Idempotence : reconfirmer ne crée pas un second lot.
    const again = await confirmBooking({
      demandeId: demande.id,
      numeroConteneur: `TESTCTR${RUN}B`,
      transporteurNom: "Total Cargo Shipping (TCL)",
      dateDepart: "2026-09-05",
    });
    expect(again.lotId).toBe(result.lotId);
  });

  it("confirme en direct (sans dossier préalable) et ajoute un transporteur inconnu au référentiel", async () => {
    const transporteurNom = `Test Transporteur ${RUN}`;
    const result = await confirmBooking({
      clientId: BARFOOTS_ID,
      produit: `Test Direct ${RUN}`,
      mode: "air",
      destinationPays: "UK",
      numeroConteneur: `TESTCTR${RUN}C`,
      transporteurNom,
      dateDepart: "2026-09-10",
    });
    created.lotIds.push(result.lotId);

    const supabase = createAdminClient();
    const { data: lot } = await supabase
      .from("lots")
      .select("transporteur:transporteurs(nom, mode)")
      .eq("id", result.lotId)
      .single();
    expect(lot?.transporteur?.nom).toBe(transporteurNom);
    expect(lot?.transporteur?.mode).toBe("air");

    const { data: transporteur } = await supabase
      .from("transporteurs")
      .select("id")
      .ilike("nom", transporteurNom)
      .single();
    if (transporteur) created.transporteurIds.push(transporteur.id);
  });
});
