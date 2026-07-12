import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Middleware Next — rafraîchit la session du portail client (Brique 4).
 * Sans effet pour les pages internes (accès service role), mais indispensable
 * pour maintenir la session `authenticated` du portail entre deux requêtes.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Tout sauf assets statiques et fichiers (images, favicon…).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
