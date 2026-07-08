import { config } from "dotenv";

// Charge .env.local (Supabase local) pour les tests d'intégration.
config({ path: ".env.local" });
