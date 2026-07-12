import { NextResponse, type NextRequest } from "next/server";

import { createServerAnonClient } from "@/lib/supabase/server";

/** Déconnexion du portail client (Brique 4) → retour à la page de connexion. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerAnonClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${request.nextUrl.origin}/portail/login`, {
    status: 303,
  });
}
