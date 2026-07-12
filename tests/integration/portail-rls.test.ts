import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

import "@/lib/supabase/ensure-websocket";
import type { Database } from "@/lib/supabase/types";

/**
 * Brique 4 — ISOLATION garantie par la RLS (pas seulement par l'UI).
 *
 * On ouvre une vraie session `authenticated` pour deux clients distincts et on
 * prouve qu'un client ne peut PAS lire les lots/preuves d'un autre — même en
 * ciblant directement un id connu. Le portail se connecte par magic link ; ici
 * on utilise un mot de passe de démo uniquement pour ouvrir la session en test.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const password = process.env.PORTAIL_DEMO_PASSWORD ?? "NaturalKiss!Demo2026";

const BARFOOTS = "b0000000-0000-4000-8000-000000000001";
const VOLTZ = "b0000000-0000-4000-8000-000000000003";
const LOT_BARFOOTS = "d0000000-0000-4000-8000-000000000003"; // Bimi #4 (photo boîte)
const LOT_VOLTZ = "d0000000-0000-4000-8000-000000000004"; // slips Voltz

const BARFOOTS_EMAIL = "portail-barfoots@demo.natural-kiss.com";
const VOLTZ_EMAIL = "portail-voltz@demo.natural-kiss.com";

const admin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** Garantit l'utilisateur Auth + sa liaison client (idempotent). */
async function ensureUser(email: string, clientId: string): Promise<void> {
  let user = await findUserByEmail(email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
  }
  const { error } = await admin
    .from("client_users")
    .upsert({ client_id: clientId, user_id: user.id }, { onConflict: "client_id,user_id" });
  if (error) throw error;
}

async function signedInClient(email: string): Promise<SupabaseClient<Database>> {
  const c = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
}

describe("Portail — isolation RLS (Brique 4)", () => {
  let barf: SupabaseClient<Database>;
  let voltz: SupabaseClient<Database>;

  beforeAll(async () => {
    await ensureUser(BARFOOTS_EMAIL, BARFOOTS);
    await ensureUser(VOLTZ_EMAIL, VOLTZ);
    barf = await signedInClient(BARFOOTS_EMAIL);
    voltz = await signedInClient(VOLTZ_EMAIL);
  }, 30_000);

  it("un client ne voit QUE ses propres lots", async () => {
    const { data, error } = await barf.from("lots").select("id, client_id");
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
    expect((data ?? []).every((l) => l.client_id === BARFOOTS)).toBe(true);
  });

  it("client A ne peut pas lire un lot de client B (même par id direct)", async () => {
    const { data } = await barf
      .from("lots")
      .select("id")
      .eq("id", LOT_VOLTZ)
      .maybeSingle();
    expect(data).toBeNull();

    const { data: reverse } = await voltz
      .from("lots")
      .select("id")
      .eq("id", LOT_BARFOOTS)
      .maybeSingle();
    expect(reverse).toBeNull();
  });

  it("le portail ne renvoie que les preuves visibles client (photo boîte, pas le QR)", async () => {
    const { data, error } = await barf
      .from("preuves_produit")
      .select("type, visible_client")
      .eq("lot_id", LOT_BARFOOTS);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    expect((data ?? []).every((p) => p.visible_client === true)).toBe(true);
    expect((data ?? []).some((p) => p.type === "photo_boite")).toBe(true);
    // Le QR de chargement (visible_client=false) doit être exclu par la RLS.
    expect((data ?? []).some((p) => p.type === "qr_chargement")).toBe(false);
  });

  it("un utilisateur anonyme (non connecté) ne voit aucun lot", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await anon.from("lots").select("id");
    expect(data ?? []).toHaveLength(0);
  });
});
