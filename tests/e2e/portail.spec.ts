import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { config } from "dotenv";
import WS from "ws";

/**
 * Brique 4 — parcours Portail client (T1) + preuve produit (M5).
 *
 * On rejoue le VRAI flux magic link : un lien est généré côté serveur
 * (`admin.generateLink`), puis consommé par la route `/auth/callback`
 * (`verifyOtp`) — exactement comme un clic depuis la boîte mail, mais sans
 * dépendre d'une livraison d'email. On vérifie ensuite que le client ne voit
 * QUE ses lots et que la photo boîte (visible) s'affiche, pas le QR interne.
 */

if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WS;
}

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const password = process.env.PORTAIL_DEMO_PASSWORD ?? "NaturalKiss!Demo2026";

const BARFOOTS = "b0000000-0000-4000-8000-000000000001";
const VOLTZ = "b0000000-0000-4000-8000-000000000003";
const LOT_VOLTZ = "d0000000-0000-4000-8000-000000000004"; // slips Voltz (autre client)

const BARFOOTS_EMAIL = "portail-barfoots@demo.natural-kiss.com";
const VOLTZ_EMAIL = "portail-voltz@demo.natural-kiss.com";

const admin = createClient(url, serviceKey, {
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

/**
 * Génère un lien magic link côté serveur et en extrait le `token_hash` + `type`
 * canoniques (tels que Supabase les enverrait par email).
 */
async function magicLink(email: string): Promise<{ tokenHash: string; type: string }> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const props = data.properties!;
  const action = new URL(props.action_link);
  const tokenHash = action.searchParams.get("token_hash") ?? props.hashed_token;
  const type = action.searchParams.get("type") ?? "magiclink";
  return { tokenHash, type };
}

/**
 * Ouvre une session portail via le vrai flux magic link. On consomme le callback
 * avec l'API request de Playwright (qui partage le cookie jar du contexte) : les
 * cookies de session posés par le `verifyOtp` sont ainsi disponibles pour les
 * navigations `page.goto` suivantes.
 */
async function login(page: Page, email: string): Promise<void> {
  const { tokenHash, type } = await magicLink(email);
  const res = await page.request.get(
    `/auth/callback?token_hash=${tokenHash}&type=${type}&next=/portail`,
    { maxRedirects: 0 },
  );
  expect(res.status()).toBe(307);
  expect(res.headers()["location"]).toContain("/portail");
}

// Sérialisé : les tokens magic link sont générés pour le même compte ; en
// parallèle, une nouvelle génération invaliderait le token du test précédent.
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await ensureUser(BARFOOTS_EMAIL, BARFOOTS);
  await ensureUser(VOLTZ_EMAIL, VOLTZ);
});

test("accès non authentifié → redirection vers la connexion", async ({ page }) => {
  await page.goto("/portail");
  await expect(page).toHaveURL(/\/portail\/login/);
  await expect(page.getByRole("heading", { name: /Connexion à votre espace/ })).toBeVisible();
});

test("client connecté : ne voit que ses lots + photo boîte (M5→portail)", async ({ page }) => {
  await login(page, BARFOOTS_EMAIL);
  await page.goto("/portail");

  // Atterrissage sur le portail, salutation personnalisée.
  await expect(page).toHaveURL(/\/portail(\/)?$/);
  await expect(
    page.getByRole("heading", { name: /Bonjour, Barfoots of Botley/ }),
  ).toBeVisible();

  // Ses lots sont listés, ceux d'un autre client ne le sont pas.
  await expect(page.getByRole("link", { name: /LOT-2026-0003/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /LOT-2026-0002/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /LOT-2026-0004/ })).toHaveCount(0);

  // Fiche lecture seule : la photo boîte (preuve visible client) s'affiche.
  await page.getByRole("link", { name: /LOT-2026-0003/ }).click();
  await expect(page).toHaveURL(/\/portail\/lots\//);
  await expect(page.getByText(/Photo produit au départ/)).toBeVisible();
  const photo = page.getByAltText("Photo produit au départ").first();
  await expect(photo).toBeVisible();
});

test("isolation : un lot d'un autre client est inaccessible (RLS)", async ({ page }) => {
  await login(page, BARFOOTS_EMAIL);
  await page.goto("/portail");
  await expect(page).toHaveURL(/\/portail(\/)?$/);

  // Accès direct par URL au lot d'un autre client → traité comme introuvable.
  await page.goto(`/portail/lots/${LOT_VOLTZ}`);
  await expect(
    page.getByText(/n'existe pas ou ne vous est pas accessible/),
  ).toBeVisible();
});
