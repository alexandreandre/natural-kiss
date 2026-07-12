import "server-only";

import { redirect } from "next/navigation";

import { createServerAnonClient } from "@/lib/supabase/server";

export interface PortailClient {
  id: string;
  nom: string;
  pays: string | null;
  ville: string | null;
}

export interface PortailContext {
  userId: string;
  email: string | null;
  client: PortailClient;
}

/**
 * Contexte du portail : utilisateur authentifié + client rattaché (via RLS).
 * Renvoie `null` si non connecté OU si l'utilisateur n'est lié à aucun client.
 *
 * Toutes les lectures passent par le client `anon + cookies` → la RLS garantit
 * l'isolation (l'utilisateur ne peut de toute façon lire que SON client).
 */
export async function getPortailContext(): Promise<PortailContext | null> {
  const supabase = await createServerAnonClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS : ne renvoie que le(s) client(s) rattaché(s) à l'utilisateur.
  const { data: client } = await supabase
    .from("clients")
    .select("id, nom, pays, ville")
    .order("nom", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!client) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    client: {
      id: client.id,
      nom: client.nom,
      pays: client.pays,
      ville: client.ville,
    },
  };
}

/**
 * Exige une session portail valide. Redirige vers la connexion sinon.
 * À appeler en tête des pages protégées du portail (jamais depuis `/login`).
 */
export async function requirePortailContext(): Promise<PortailContext> {
  const ctx = await getPortailContext();
  if (!ctx) redirect("/portail/login");
  return ctx;
}
