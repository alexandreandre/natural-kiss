import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { clientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Callback d'authentification du portail client (Brique 4).
 *
 * Supporte les deux formes de lien Supabase :
 *   • `?code=…`                    → flux PKCE (magic link envoyé par l'app) ;
 *   • `?token_hash=…&type=…`       → vérification OTP (liens générés côté serveur,
 *                                     utilisé aussi par les tests E2E).
 *
 * Les cookies de session sont écrits DIRECTEMENT sur la réponse de redirection
 * renvoyée : c'est indispensable pour qu'ils survivent au `302` (sinon la session
 * est perdue et l'utilisateur rebondit sur la page de connexion).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/portail";

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = clientEnv();
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return response;
  }

  return NextResponse.redirect(`${origin}/portail/login?error=auth`);
}
