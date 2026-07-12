import "server-only";

import { getBookingConfirmationProvider } from "@/lib/adapters";
import { generateDossierText, nextLotReference, parseLotSeq } from "@/lib/booking/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

export type BookingStatut = Database["public"]["Enums"]["booking_statut"];
export type TransportMode = Database["public"]["Enums"]["transport_mode"];

export interface DemandeBookingRow {
  id: string;
  clientId: string;
  clientNom: string;
  produit: string;
  variete: string | null;
  quantite: number | null;
  unite: string | null;
  incoterm: string | null;
  destinationPays: string | null;
  destinationPort: string | null;
  mode: TransportMode;
  dateSouhaitee: string | null;
  dossierTexte: string;
  statut: BookingStatut;
  canal: string | null;
  lotId: string | null;
  lotReference: string | null;
  createdAt: string;
}

interface DemandeBookingSelectRow {
  id: string;
  produit: string;
  variete: string | null;
  quantite: number | null;
  unite: string | null;
  incoterm: string | null;
  destination_pays: string | null;
  destination_port: string | null;
  mode: TransportMode;
  date_souhaitee: string | null;
  dossier_texte: string;
  statut: BookingStatut;
  canal: string | null;
  lot_id: string | null;
  created_at: string;
  client_id: string;
  client?: { nom: string } | null;
  lot?: { reference: string } | null;
}

const DEMANDE_SELECT =
  "id, produit, variete, quantite, unite, incoterm, destination_pays, destination_port, mode, date_souhaitee, dossier_texte, statut, canal, lot_id, created_at, client_id, client:clients(nom), lot:lots(reference)";

function mapDemande(row: DemandeBookingSelectRow): DemandeBookingRow {
  return {
    id: row.id,
    clientId: row.client_id,
    clientNom: row.client?.nom ?? "—",
    produit: row.produit,
    variete: row.variete,
    quantite: row.quantite,
    unite: row.unite,
    incoterm: row.incoterm,
    destinationPays: row.destination_pays,
    destinationPort: row.destination_port,
    mode: row.mode,
    dateSouhaitee: row.date_souhaitee,
    dossierTexte: row.dossier_texte,
    statut: row.statut,
    canal: row.canal,
    lotId: row.lot_id,
    lotReference: row.lot?.reference ?? null,
    createdAt: row.created_at,
  };
}

export interface ClientOption {
  id: string;
  nom: string;
}

/** Clients du référentiel (M0), pour le sélecteur du formulaire de demande. */
export async function listClientOptions(): Promise<ClientOption[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, nom")
    .order("nom", { ascending: true });

  if (error) throw new Error(`Lecture des clients impossible : ${error.message}`);
  return data ?? [];
}

/** Registre des dossiers de réservation, les plus récents en premier. */
export async function listDemandesBooking(): Promise<DemandeBookingRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("demandes_booking")
    .select(DEMANDE_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Lecture des dossiers de booking impossible : ${error.message}`);
  return (data ?? []).map((r) => mapDemande(r as DemandeBookingSelectRow));
}

export async function getDemandeBooking(id: string): Promise<DemandeBookingRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("demandes_booking")
    .select(DEMANDE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Lecture du dossier de booking impossible : ${error.message}`);
  return data ? mapDemande(data as DemandeBookingSelectRow) : null;
}

export interface CreateDemandeBookingInput {
  clientId: string;
  produit: string;
  variete?: string | null;
  quantite?: number | null;
  unite?: string | null;
  incoterm?: string | null;
  destinationPays?: string | null;
  destinationPort?: string | null;
  mode: TransportMode;
  dateSouhaitee?: string | null;
  commandeId?: string | null;
  planningId?: string | null;
}

/**
 * Crée le dossier de réservation : génère le brief standardisé (texte
 * copiable vers n'importe quel canal) et persiste la demande en `brouillon`.
 */
export async function createDemandeBooking(
  input: CreateDemandeBookingInput,
): Promise<DemandeBookingRow> {
  const supabase = createAdminClient();

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("nom")
    .eq("id", input.clientId)
    .maybeSingle();
  if (clientErr) throw new Error(`Lecture du client impossible : ${clientErr.message}`);
  if (!client) throw new Error(`Client introuvable : ${input.clientId}`);

  const dossierTexte = generateDossierText({
    clientNom: client.nom,
    produit: input.produit,
    variete: input.variete ?? null,
    quantite: input.quantite ?? null,
    unite: input.unite ?? null,
    incoterm: input.incoterm ?? null,
    destinationPays: input.destinationPays ?? null,
    destinationPort: input.destinationPort ?? null,
    mode: input.mode,
    dateSouhaitee: input.dateSouhaitee ?? null,
  });

  const { data, error } = await supabase
    .from("demandes_booking")
    .insert({
      client_id: input.clientId,
      commande_id: input.commandeId ?? null,
      planning_id: input.planningId ?? null,
      produit: input.produit,
      variete: input.variete ?? null,
      quantite: input.quantite ?? null,
      unite: input.unite ?? null,
      incoterm: input.incoterm ?? null,
      destination_pays: input.destinationPays ?? null,
      destination_port: input.destinationPort ?? null,
      mode: input.mode,
      date_souhaitee: input.dateSouhaitee ?? null,
      dossier_texte: dossierTexte,
      statut: "brouillon",
    })
    .select(DEMANDE_SELECT)
    .single();

  if (error) throw new Error(`Création du dossier de booking impossible : ${error.message}`);
  return mapDemande(data as DemandeBookingSelectRow);
}

/** Marque le dossier comme envoyé (le canal réel — email, portail, appel — reste libre et externe). */
export async function markDemandeEnvoyee(
  demandeId: string,
  canal?: string | null,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("demandes_booking")
    .update({ statut: "envoye", envoyee_le: new Date().toISOString(), canal: canal ?? null })
    .eq("id", demandeId)
    .eq("statut", "brouillon");

  if (error) throw new Error(`Mise à jour du dossier de booking impossible : ${error.message}`);
}

/** Pré-remplissage du formulaire de confirmation depuis un mail collé (IA, tout canal). */
export async function parseConfirmationEmail(emailText: string) {
  return getBookingConfirmationProvider().parseConfirmation(emailText);
}

async function resolveTransporteur(
  supabase: ReturnType<typeof createAdminClient>,
  nom: string,
  mode: TransportMode,
): Promise<string> {
  const trimmed = nom.trim();
  const { data: existing, error: findErr } = await supabase
    .from("transporteurs")
    .select("id")
    .ilike("nom", trimmed)
    .maybeSingle();
  if (findErr) throw new Error(`Recherche du transporteur impossible : ${findErr.message}`);
  if (existing) return existing.id;

  // Transporteur inconnu du référentiel (M0) : on l'y ajoute — le canal de
  // réservation est trop variable pour figer une liste fermée à l'avance.
  const { data: created, error: insertErr } = await supabase
    .from("transporteurs")
    .insert({ nom: trimmed, mode })
    .select("id")
    .single();
  if (insertErr) throw new Error(`Création du transporteur impossible : ${insertErr.message}`);
  return created.id;
}

async function nextLotReferenceForToday(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<string> {
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from("lots")
    .select("reference")
    .like("reference", `LOT-${year}-%`);
  if (error) throw new Error(`Lecture des références de lot impossible : ${error.message}`);

  const lastSeq = (data ?? []).reduce(
    (max, row) => Math.max(max, parseLotSeq(row.reference, year)),
    0,
  );
  return nextLotReference(year, lastSeq);
}

/** Le point d'entrée unique de confirmation : d'un dossier existant. */
export interface ConfirmBookingFromDemandeInput {
  demandeId: string;
  numeroConteneur: string;
  transporteurNom: string;
  dateDepart: string;
}

/** Le point d'entrée unique de confirmation : réservation directe (sans dossier préalable). */
export interface ConfirmBookingDirectInput {
  demandeId?: undefined;
  clientId: string;
  produit: string;
  variete?: string | null;
  mode: TransportMode;
  destinationPays?: string | null;
  destinationPort?: string | null;
  commandeId?: string | null;
  numeroConteneur: string;
  transporteurNom: string;
  dateDepart: string;
}

export type ConfirmBookingInput =
  | ConfirmBookingFromDemandeInput
  | ConfirmBookingDirectInput;

export interface ConfirmBookingResult {
  lotId: string;
  lotReference: string;
}

/**
 * LE geste qui fait naître le LOT — peu importe comment la confirmation est
 * arrivée (email lu par l'IA, coup de fil retranscrit à la main, copie d'un
 * portail transporteur) : 3 champs (n° conteneur, transporteur, date de
 * départ) suffisent. Idempotent si le dossier est déjà confirmé (renvoie le
 * lot existant plutôt que d'en recréer un).
 */
export async function confirmBooking(
  input: ConfirmBookingInput,
): Promise<ConfirmBookingResult> {
  const supabase = createAdminClient();

  let clientId: string;
  let produit: string;
  let variete: string | null;
  let mode: TransportMode;
  let destinationPays: string | null;
  let destinationPort: string | null;
  let commandeId: string | null;

  if ("demandeId" in input && input.demandeId) {
    const { data: demande, error } = await supabase
      .from("demandes_booking")
      .select(
        "client_id, produit, variete, mode, destination_pays, destination_port, commande_id, lot_id, lot:lots(id, reference)",
      )
      .eq("id", input.demandeId)
      .maybeSingle();
    if (error) throw new Error(`Lecture du dossier de booking impossible : ${error.message}`);
    if (!demande) throw new Error(`Dossier de booking introuvable : ${input.demandeId}`);

    // Idempotence : déjà confirmé → on renvoie le lot existant sans en recréer un.
    if (demande.lot_id && demande.lot) {
      return { lotId: demande.lot.id, lotReference: demande.lot.reference };
    }

    clientId = demande.client_id;
    produit = demande.produit;
    variete = demande.variete;
    mode = demande.mode;
    destinationPays = demande.destination_pays;
    destinationPort = demande.destination_port;
    commandeId = demande.commande_id;
  } else {
    const direct = input as ConfirmBookingDirectInput;
    clientId = direct.clientId;
    produit = direct.produit;
    variete = direct.variete ?? null;
    mode = direct.mode;
    destinationPays = direct.destinationPays ?? null;
    destinationPort = direct.destinationPort ?? null;
    commandeId = direct.commandeId ?? null;
  }

  const transporteurId = await resolveTransporteur(supabase, input.transporteurNom, mode);
  const reference = await nextLotReferenceForToday(supabase);

  const { data: lot, error: lotErr } = await supabase
    .from("lots")
    .insert({
      reference,
      numero_conteneur: input.numeroConteneur.trim(),
      commande_id: commandeId,
      client_id: clientId,
      transporteur_id: transporteurId,
      produit,
      variete,
      mode,
      statut: "booking",
      destination_port: destinationPort,
      destination_pays: destinationPays,
      date_booking: new Date().toISOString().slice(0, 10),
      date_depart: input.dateDepart,
    })
    .select("id, reference")
    .single();
  if (lotErr) throw new Error(`Création du lot impossible : ${lotErr.message}`);

  if ("demandeId" in input && input.demandeId) {
    const { error: updateErr } = await supabase
      .from("demandes_booking")
      .update({ statut: "confirme", lot_id: lot.id })
      .eq("id", input.demandeId);
    if (updateErr) {
      throw new Error(`Mise à jour du dossier de booking impossible : ${updateErr.message}`);
    }
  }

  return { lotId: lot.id, lotReference: lot.reference };
}
