import "server-only";
import "@/lib/supabase/ensure-websocket";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { clientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

// Réexport pratique : accès interne service role (défini sans `next/headers`).
export { createAdminClient } from "@/lib/supabase/admin";

/**
 * Client Supabase serveur lié à la session (anon key + cookies) → respecte la RLS.
 * Usage : rendu côté serveur pour un utilisateur authentifié (portail, Brique 4).
 */
export async function createServerAnonClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = clientEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component : ignorable si un middleware
            // rafraîchit déjà la session.
          }
        },
      },
    },
  );
}
