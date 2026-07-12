// Provisionne les utilisateurs Auth de démo du portail client (Brique 4) et les
// rattache à leur client via `client_users`. Rejouable (idempotent).
// Exécuté par `npm run seed` (donc par `npm run db:reset`).
//
// Modèle : magic link en production (aucun mot de passe géré par l'app). On crée
// néanmoins les utilisateurs avec un mot de passe de démo (email confirmé) pour
// permettre aux TESTS d'ouvrir une session sans boîte mail. Ce mot de passe n'est
// utilisé nulle part dans l'UI (le portail se connecte par magic link).

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import WS from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WS;
}

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "[seed-portail] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (.env.local).",
  );
  process.exit(1);
}

// Mot de passe de démo (tests uniquement) — surchargable par l'environnement.
const DEMO_PASSWORD = process.env.PORTAIL_DEMO_PASSWORD ?? "NaturalKiss!Demo2026";

// Deux clients distincts, avec des lots séparés → vérifie l'isolation :
//   • Barfoots (b…0001) : lots Bimi 2 & 3 (photo boîte visible sur le lot 3) ;
//   • Graines Voltz (b…0003) : lot slips 4.
const MAPPINGS = [
  { email: "portail-barfoots@demo.natural-kiss.com", clientId: "b0000000-0000-4000-8000-000000000001" },
  { email: "portail-voltz@demo.natural-kiss.com", clientId: "b0000000-0000-4000-8000-000000000003" },
];

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Retrouve un utilisateur par email (pagination admin), sinon null. */
async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

let created = 0;
let linked = 0;

for (const { email, clientId } of MAPPINGS) {
  let user = await findUserByEmail(email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error(`[seed-portail] création ${email} échouée : ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    user = data.user;
    created++;
    console.log(`[seed-portail] ✓ utilisateur créé : ${email}`);
  } else {
    console.log(`[seed-portail] · utilisateur existant : ${email}`);
  }

  const { error: linkErr } = await supabase
    .from("client_users")
    .upsert({ client_id: clientId, user_id: user.id }, { onConflict: "client_id,user_id" });

  if (linkErr) {
    console.error(`[seed-portail] liaison ${email} échouée : ${linkErr.message}`);
    process.exitCode = 1;
  } else {
    linked++;
    console.log(`[seed-portail] ✓ liaison client_users : ${email} → ${clientId}`);
  }
}

console.log(`[seed-portail] terminé — ${created} créé(s), ${linked} liaison(s).`);
