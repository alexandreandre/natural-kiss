import { z } from "zod";

/**
 * Validation des variables d'environnement (Zod aux frontières).
 *
 * - `clientEnv` : variables `NEXT_PUBLIC_*`, injectées au build, sûres côté navigateur.
 * - `serverEnv` : secrets serveur (service role), jamais exposés au client.
 *
 * La validation est *paresseuse* : elle n'est déclenchée qu'au premier accès,
 * pour ne pas casser des commandes (lint, build de types) qui n'ont pas besoin
 * d'une configuration Supabase complète.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message:
      "NEXT_PUBLIC_SUPABASE_URL manquant ou invalide. Copiez .env.local.example vers .env.local.",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY manquant."),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY manquant (secret serveur)."),
});

type ClientEnv = z.infer<typeof clientSchema>;
type ServerEnv = z.infer<typeof serverSchema>;

let cachedClient: ClientEnv | null = null;
let cachedServer: ServerEnv | null = null;

/** Variables publiques (navigateur + serveur). */
export function clientEnv(): ClientEnv {
  if (cachedClient) return cachedClient;
  // Les `NEXT_PUBLIC_*` sont inlinées par Next : on doit les référencer statiquement.
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Configuration client invalide :\n${formatIssues(parsed.error)}`);
  }
  cachedClient = parsed.data;
  return cachedClient;
}

/** Secrets serveur (jamais importés côté client). */
export function serverEnv(): ServerEnv {
  if (cachedServer) return cachedServer;
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Configuration serveur invalide :\n${formatIssues(parsed.error)}`);
  }
  cachedServer = parsed.data;
  return cachedServer;
}

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}
