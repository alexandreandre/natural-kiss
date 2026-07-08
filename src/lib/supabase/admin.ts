import "@/lib/supabase/ensure-websocket";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { clientEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Client Supabase "admin" (service role) — accès interne complet, contourne RLS.
 *
 * Volontairement isolé (pas d'import de `next/headers`) pour être utilisable en
 * dehors du runtime Next : logique interne, scripts, tests d'intégration.
 * ⚠️ À n'utiliser QUE côté serveur ; ne jamais importer dans un bundle client.
 */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = clientEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();
  return createSupabaseClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
