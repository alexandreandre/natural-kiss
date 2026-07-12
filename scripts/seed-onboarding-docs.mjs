// Top-up idempotent des documents d'onboarding de démo (Brique 7bis).
// Aligné sur supabase/seed.sql — sûr à rejouer (upsert par id). Service role.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.");
  process.exit(1);
}
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BARFOOTS = "b0000000-0000-4000-8000-000000000001";
const docs = [
  {
    id: "a3000000-0000-4000-8000-000000000001",
    type: "bienvenue",
    titre: "Bienvenue chez Natural Kiss — Barfoots of Botley Ltd",
    contenu_html:
      "<h1>Bienvenue, Barfoots of Botley Ltd</h1><p>Votre espace client est actif.</p><p><strong>Accès&nbsp;:</strong> /portail/login</p>",
  },
  {
    id: "a3000000-0000-4000-8000-000000000002",
    type: "certifs",
    titre: "Nos certifications",
    contenu_html:
      "<h1>Certifications Natural Kiss</h1><ul><li>GlobalG.A.P.</li><li>GRASP</li><li>BRCGS</li><li>SMETA</li><li>Sedex</li></ul>",
  },
  {
    id: "a3000000-0000-4000-8000-000000000003",
    type: "produit",
    titre: "Fiche produit & prochaines étapes — Tenderstem / Bimi",
    contenu_html:
      "<h1>Tenderstem / Bimi → UK</h1><h2>Prochaines étapes</h2><ol><li>Validation des specs.</li><li>Booking.</li><li>Suivi du lot.</li></ol>",
  },
].map((d) => ({ ...d, client_id: BARFOOTS, demande_id: null }));

const { error } = await admin
  .from("documents_onboarding")
  .upsert(docs, { onConflict: "id" });
if (error) {
  console.error("Seed documents_onboarding échoué :", error.message);
  process.exit(1);
}
console.log(`✓ ${docs.length} documents d'onboarding de démo (Barfoots).`);
