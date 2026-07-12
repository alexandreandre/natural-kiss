"use server";

import { revalidatePath } from "next/cache";

import {
  createDemande,
  onboardDemande,
  type CreateDemandeResult,
} from "@/lib/onboarding/service";

export interface CreateDemandeActionResult {
  ok: boolean;
  error?: string;
  decision?: CreateDemandeResult["match"]["decision"];
  raison?: string;
  manquantes?: string[];
  mailSent?: boolean;
  tachesCreees?: number;
}

/** Réception + qualification automatique d'une demande depuis le formulaire. */
export async function createDemandeAction(
  formData: FormData,
): Promise<CreateDemandeActionResult> {
  const clientNom = String(formData.get("clientNom") ?? "").trim();
  const produit = String(formData.get("produit") ?? "").trim();
  const pays = String(formData.get("pays") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
  const volume = String(formData.get("volume") ?? "").trim() || null;

  if (!clientNom || !produit || !pays) {
    return { ok: false, error: "Client, produit et pays sont requis." };
  }

  try {
    const res = await createDemande({
      clientNom,
      produit,
      pays,
      contactEmail,
      volume,
    });
    revalidatePath("/demande");
    return {
      ok: true,
      decision: res.match.decision,
      raison: res.match.raison,
      manquantes: res.match.manquantes.map((m) => m.raison),
      mailSent: res.mailSent,
      tachesCreees: res.tachesCreees,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
}

export interface OnboardActionResult {
  ok: boolean;
  error?: string;
  email?: string;
  alreadyExisted?: boolean;
}

/** Crée l'espace client (M2) pour une demande qualifiée. */
export async function onboardDemandeAction(
  demandeId: string,
): Promise<OnboardActionResult> {
  try {
    const res = await onboardDemande(demandeId);
    revalidatePath("/demande");
    revalidatePath("/portail");
    return { ok: true, email: res.email, alreadyExisted: res.alreadyExisted };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
}

export interface PublicDemandeActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Soumission publique d'une demande (page client `/nouvelle-demande`). Réutilise
 * le matching interne mais ne renvoie qu'une confirmation neutre : le résultat du
 * matching reste côté interne (l'équipe NK valide avant l'onboarding).
 */
export async function submitPublicDemandeAction(
  formData: FormData,
): Promise<PublicDemandeActionResult> {
  // Endpoint public non authentifié : on borne la longueur des champs libres
  // pour éviter tout gonflement de lignes (défense minimale, MVP).
  const cap = (v: FormDataEntryValue | null, n: number) =>
    String(v ?? "")
      .trim()
      .slice(0, n);
  const clientNom = cap(formData.get("clientNom"), 200);
  const produit = cap(formData.get("produit"), 120);
  const pays = cap(formData.get("pays"), 60);
  const contactEmail = cap(formData.get("contactEmail"), 200) || null;
  const volume = cap(formData.get("volume"), 120) || null;

  if (!clientNom || !produit || !pays) {
    return { ok: false, error: "Société, produit et pays sont requis." };
  }

  try {
    await createDemande({ clientNom, produit, pays, contactEmail, volume });
    revalidatePath("/demande");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
}
