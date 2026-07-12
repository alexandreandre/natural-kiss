"use server";

import { revalidatePath } from "next/cache";

import type { BookingConfirmationExtract } from "@/lib/adapters/types";
import {
  confirmBooking,
  createDemandeBooking,
  markDemandeEnvoyee,
  parseConfirmationEmail,
  type TransportMode,
} from "@/lib/booking/service";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
}

function num(formData: FormData, key: string): number | null {
  const s = str(formData, key);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const MODES: TransportMode[] = ["sea", "roro", "air", "road"];

function mode(formData: FormData): TransportMode {
  const m = str(formData, "mode");
  return m && (MODES as string[]).includes(m) ? (m as TransportMode) : "sea";
}

/** Crée le dossier de réservation (brouillon) depuis le formulaire « Nouvelle demande ». */
export async function createDemandeBookingAction(
  formData: FormData,
): Promise<ActionResult> {
  const clientId = str(formData, "clientId");
  const produit = str(formData, "produit");
  if (!clientId || !produit) {
    return { ok: false, error: "Client et produit sont obligatoires." };
  }

  try {
    await createDemandeBooking({
      clientId,
      produit,
      variete: str(formData, "variete"),
      quantite: num(formData, "quantite"),
      unite: str(formData, "unite"),
      incoterm: str(formData, "incoterm"),
      destinationPays: str(formData, "destinationPays"),
      destinationPort: str(formData, "destinationPort"),
      mode: mode(formData),
      dateSouhaitee: str(formData, "dateSouhaitee"),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue." };
  }

  revalidatePath("/booking");
  return { ok: true };
}

/** Marque le dossier comme envoyé (le canal réel reste externe et libre). */
export async function markDemandeEnvoyeeAction(
  demandeId: string,
  canal?: string,
): Promise<ActionResult> {
  try {
    await markDemandeEnvoyee(demandeId, canal ?? null);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
  revalidatePath("/booking");
  return { ok: true };
}

export interface ConfirmBookingActionResult extends ActionResult {
  lotId?: string;
  lotReference?: string;
}

/** Point d'entrée unique de confirmation : crée le lot, depuis un dossier ou en direct. */
export async function confirmBookingAction(
  formData: FormData,
): Promise<ConfirmBookingActionResult> {
  const numeroConteneur = str(formData, "numeroConteneur");
  const transporteurNom = str(formData, "transporteurNom");
  const dateDepart = str(formData, "dateDepart");
  if (!numeroConteneur || !transporteurNom || !dateDepart) {
    return {
      ok: false,
      error: "N° de conteneur, transporteur et date de départ sont obligatoires.",
    };
  }

  const demandeId = str(formData, "demandeId");

  try {
    const result = demandeId
      ? await confirmBooking({
          demandeId,
          numeroConteneur,
          transporteurNom,
          dateDepart,
        })
      : await (async () => {
          const clientId = str(formData, "clientId");
          const produit = str(formData, "produit");
          if (!clientId || !produit) {
            throw new Error(
              "Sans dossier préalable, client et produit sont obligatoires.",
            );
          }
          return confirmBooking({
            clientId,
            produit,
            variete: str(formData, "variete"),
            mode: mode(formData),
            destinationPays: str(formData, "destinationPays"),
            destinationPort: str(formData, "destinationPort"),
            numeroConteneur,
            transporteurNom,
            dateDepart,
          });
        })();

    revalidatePath("/booking");
    revalidatePath("/lots");
    return { ok: true, lotId: result.lotId, lotReference: result.lotReference };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
}

export interface ParseConfirmationResult {
  ok: boolean;
  extract?: BookingConfirmationExtract;
  error?: string;
}

/** Pré-remplit le formulaire de confirmation depuis un mail collé (IA, tout canal). */
export async function parseConfirmationEmailAction(
  formData: FormData,
): Promise<ParseConfirmationResult> {
  const emailText = str(formData, "emailText");
  if (!emailText) return { ok: false, error: "Aucun texte de mail fourni." };

  try {
    const extract = await parseConfirmationEmail(emailText);
    return { ok: true, extract };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
}
