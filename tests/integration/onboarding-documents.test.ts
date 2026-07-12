import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

import "@/lib/supabase/ensure-websocket";
import { createDemande, onboardDemande } from "@/lib/onboarding/service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

/**
 * Brique 7bis — génération des documents d'onboarding + journal des emails,
 * contre Supabase (coffre du seed). Vérifie : 3 documents créés, emails
 * journalisés (pack_certif + onboarding), et RLS (le client voit SES documents,
 * un anonyme n'en voit aucun). Nettoie tout ce qui est créé.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const password = process.env.PORTAIL_DEMO_PASSWORD ?? "NaturalKiss!Demo2026";
const admin = createAdminClient();
const RUN = Date.now();

const created = { demandeId: "", clientId: "", userId: "" };

afterAll(async () => {
  if (created.demandeId)
    await admin.from("emails_envoyes").delete().eq("demande_id", created.demandeId);
  if (created.demandeId)
    await admin.from("demandes").delete().eq("id", created.demandeId);
  if (created.clientId) await admin.from("clients").delete().eq("id", created.clientId); // cascade docs + client_users
  if (created.userId)
    await admin.auth.admin.deleteUser(created.userId).catch(() => undefined);
});

describe("Onboarding — documents & emails (Supabase)", () => {
  it("brocoli → UK : onboarding génère 3 documents + journalise les emails", async () => {
    const email = `docs-${RUN}@example.com`;
    const demande = await createDemande({
      clientNom: `Docs Test ${RUN}`,
      contactEmail: email,
      produit: "Brocoli / Tenderstem",
      pays: "UK",
    });
    created.demandeId = demande.demandeId;
    expect(demande.match.decision).toBe("suffisant");

    const { data: packMails } = await admin
      .from("emails_envoyes")
      .select("categorie")
      .eq("demande_id", demande.demandeId)
      .eq("categorie", "pack_certif");
    expect((packMails ?? []).length).toBe(1);

    const onboard = await onboardDemande(demande.demandeId);
    created.clientId = onboard.clientId;
    created.userId = onboard.userId;
    expect(onboard.documentsCreated).toBe(3);

    const { data: docs } = await admin
      .from("documents_onboarding")
      .select("type, titre")
      .eq("client_id", onboard.clientId);
    expect((docs ?? []).map((d) => d.type).sort()).toEqual([
      "bienvenue",
      "certifs",
      "produit",
    ]);

    const { data: onbMails } = await admin
      .from("emails_envoyes")
      .select("categorie")
      .eq("demande_id", demande.demandeId)
      .eq("categorie", "onboarding");
    expect((onbMails ?? []).length).toBe(1);
  });

  it("RLS : le client onboardé voit SES 3 documents", async () => {
    const c: SupabaseClient<Database> = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signErr } = await c.auth.signInWithPassword({
      email: `docs-${RUN}@example.com`,
      password,
    });
    expect(signErr).toBeNull();

    const { data, error } = await c
      .from("documents_onboarding")
      .select("id, client_id");
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(3);
    expect((data ?? []).every((d) => d.client_id === created.clientId)).toBe(true);
  });

  it("RLS : un utilisateur anonyme ne voit aucun document", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await anon.from("documents_onboarding").select("id");
    expect(data ?? []).toHaveLength(0);
  });
});
