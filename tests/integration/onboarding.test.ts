import { afterAll, describe, expect, it } from "vitest";

import { createDemande, loadCoffre, onboardDemande } from "@/lib/onboarding/service";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Brique 7 — Demande & Onboarding contre Supabase (coffre M0c du seed).
 * Vérifie le flux complet : matching → décision → envoi/alerte → espace client.
 * Nettoie les lignes créées (demandes, tâches, client + user onboardés).
 */
const RUN = Date.now();
const created = {
  demandeIds: [] as string[],
  clientIds: [] as string[],
  userIds: [] as string[],
};

afterAll(async () => {
  const supabase = createAdminClient();
  for (const id of created.demandeIds) {
    await supabase.from("emails_envoyes").delete().eq("demande_id", id);
    await supabase.from("demandes").delete().eq("id", id); // cascade → taches
  }
  for (const id of created.clientIds) {
    await supabase.from("clients").delete().eq("id", id); // cascade → client_users
  }
  for (const id of created.userIds) {
    await supabase.auth.admin.deleteUser(id).catch(() => undefined);
  }
});

describe("Onboarding (Supabase, coffre du seed)", () => {
  it("le coffre M0c contient les 5 certifications", async () => {
    const coffre = await loadCoffre();
    const types = new Set(coffre.map((c) => c.type));
    for (const t of ["ggap", "grasp", "brcgs", "smeta", "sedex"] as const) {
      expect(types.has(t)).toBe(true);
    }
  });

  it("mangue → UK : insuffisant + workflow de correction (GGAP/GRASP)", async () => {
    const res = await createDemande({
      clientNom: `Test SHP ${RUN}`,
      contactEmail: `mangue-${RUN}@example.com`,
      produit: "Mangue",
      pays: "UK",
    });
    created.demandeIds.push(res.demandeId);

    expect(res.match.decision).toBe("insuffisant");
    expect(res.mailSent).toBe(false);
    expect(res.tachesCreees).toBe(2);
    expect(res.match.manquantes.map((m) => m.type).sort()).toEqual(["ggap", "grasp"]);

    // Tâches de correction persistées.
    const supabase = createAdminClient();
    const { data: taches } = await supabase
      .from("taches_correction")
      .select("certif_type")
      .eq("demande_id", res.demandeId);
    expect((taches ?? []).map((t) => t.certif_type).sort()).toEqual(["ggap", "grasp"]);
  });

  it("brocoli → UK : suffisant + envoi auto (mock) + onboarding espace client", async () => {
    const clientNom = `Test Brocoli ${RUN}`;
    const email = `brocoli-${RUN}@example.com`;
    const res = await createDemande({
      clientNom,
      contactEmail: email,
      produit: "Brocoli / Tenderstem",
      pays: "UK",
    });
    created.demandeIds.push(res.demandeId);

    expect(res.match.decision).toBe("suffisant");
    expect(res.mailSent).toBe(true);
    expect(res.tachesCreees).toBe(0);

    // Décision + pack tracés en base.
    const supabase = createAdminClient();
    const { data: demande } = await supabase
      .from("demandes")
      .select("statut, decision, raison, pack_envoye_at")
      .eq("id", res.demandeId)
      .single();
    expect(demande?.decision).toBe("suffisant");
    expect(demande?.statut).toBe("envoyee");
    expect(demande?.pack_envoye_at).not.toBeNull();

    // Onboarding → espace client (client + user + liaison client_users).
    const onboard = await onboardDemande(res.demandeId);
    created.clientIds.push(onboard.clientId);
    created.userIds.push(onboard.userId);
    expect(onboard.email).toBe(email);

    const { data: link } = await supabase
      .from("client_users")
      .select("client_id, user_id")
      .eq("client_id", onboard.clientId)
      .eq("user_id", onboard.userId)
      .maybeSingle();
    expect(link).not.toBeNull();

    const { data: after } = await supabase
      .from("demandes")
      .select("espace_client_cree, statut, client_id")
      .eq("id", res.demandeId)
      .single();
    expect(after?.espace_client_cree).toBe(true);
    expect(after?.statut).toBe("cloturee");
    expect(after?.client_id).toBe(onboard.clientId);
  });
});
