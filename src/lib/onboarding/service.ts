import "server-only";

import { getEmailProvider } from "@/lib/adapters";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  CERTIF_LABELS,
  certificationsExpirantSous,
  matchDemande,
  type CertifStatut,
  type CertifType,
  type CoffreCert,
  type ExpirationAlert,
  type MatchResult,
} from "@/lib/onboarding/rules";
import { buildOnboardingDocuments } from "@/lib/onboarding/documents";

type DemandeStatut = Database["public"]["Enums"]["demande_statut"];
type DemandeDecision = Database["public"]["Enums"]["demande_decision"];
type TacheStatut = Database["public"]["Enums"]["tache_statut"];
type EmailCategorie = Database["public"]["Enums"]["email_categorie"];

// ── Formes de lecture pour l'UI ──────────────────────────────────────────────

export interface CoffreCertRow {
  id: string;
  type: CertifType;
  label: string;
  organisme: string | null;
  numero: string | null;
  produits: string[];
  pays: string[];
  statut: CertifStatut;
  dateExpiration: string | null;
  /** Alerte d'expiration si sous le seuil (ou expirée), sinon null. */
  alerte: ExpirationAlert | null;
}

export interface TacheRow {
  id: string;
  certifType: CertifType;
  certifLabel: string;
  produit: string;
  pays: string;
  libelle: string;
  statut: TacheStatut;
  assignee: string | null;
  echeance: string | null;
}

export interface DemandeRow {
  id: string;
  clientId: string | null;
  clientNom: string;
  contactEmail: string | null;
  produit: string;
  pays: string;
  volume: string | null;
  statut: DemandeStatut;
  decision: DemandeDecision;
  raison: string | null;
  certifsRequises: string[];
  certifsManquantes: string[];
  packEnvoyeLe: string | null;
  espaceClientCree: boolean;
  createdAt: string;
  taches: TacheRow[];
}

export interface OnboardingOverview {
  demandes: DemandeRow[];
  coffre: CoffreCertRow[];
  alertes: ExpirationAlert[];
}

const EXPIRATION_SEUIL_JOURS = 30;

function toCoffreCert(row: {
  type: CertifType;
  produits: string[] | null;
  pays: string[] | null;
  statut: CertifStatut;
  date_expiration: string | null;
}): CoffreCert {
  return {
    type: row.type,
    produits: row.produits ?? [],
    pays: row.pays ?? [],
    statut: row.statut,
    dateExpiration: row.date_expiration,
  };
}

/** Lit le coffre M0c (adapté au matching) — source de vérité des certifs. */
export async function loadCoffre(): Promise<CoffreCert[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("certifications")
    .select("type, produits, pays, statut, date_expiration");
  if (error) throw new Error(`Lecture du coffre impossible : ${error.message}`);
  return (data ?? []).map(toCoffreCert);
}

/** Aperçu complet de la page Demande & Onboarding. */
export async function getOnboardingOverview(): Promise<OnboardingOverview> {
  const supabase = createAdminClient();

  const [certifs, demandes, taches] = await Promise.all([
    supabase
      .from("certifications")
      .select("id, type, organisme, numero, produits, pays, statut, date_expiration")
      .order("type", { ascending: true }),
    supabase
      .from("demandes")
      .select(
        "id, client_id, client_nom, contact_email, produit, pays, volume, statut, decision, raison, certifs_requises, certifs_manquantes, pack_envoye_at, espace_client_cree, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("taches_correction")
      .select(
        "id, demande_id, certif_type, produit, pays, libelle, statut, assignee, echeance",
      ),
  ]);

  if (certifs.error)
    throw new Error(`Lecture des certifications impossible : ${certifs.error.message}`);
  if (demandes.error)
    throw new Error(`Lecture des demandes impossible : ${demandes.error.message}`);
  if (taches.error)
    throw new Error(`Lecture des tâches impossible : ${taches.error.message}`);

  const now = new Date();
  const coffreCerts = (certifs.data ?? []).map(toCoffreCert);
  const alertesByType = new Map<CertifType, ExpirationAlert>();
  for (const a of certificationsExpirantSous(
    coffreCerts,
    EXPIRATION_SEUIL_JOURS,
    now,
  )) {
    alertesByType.set(a.type, a);
  }

  const coffre: CoffreCertRow[] = (certifs.data ?? []).map((c) => ({
    id: c.id,
    type: c.type,
    label: CERTIF_LABELS[c.type],
    organisme: c.organisme,
    numero: c.numero,
    produits: c.produits ?? [],
    pays: c.pays ?? [],
    statut: c.statut,
    dateExpiration: c.date_expiration,
    alerte: alertesByType.get(c.type) ?? null,
  }));

  const tachesByDemande = new Map<string, TacheRow[]>();
  for (const t of taches.data ?? []) {
    const row: TacheRow = {
      id: t.id,
      certifType: t.certif_type,
      certifLabel: CERTIF_LABELS[t.certif_type],
      produit: t.produit,
      pays: t.pays,
      libelle: t.libelle,
      statut: t.statut,
      assignee: t.assignee,
      echeance: t.echeance,
    };
    const list = tachesByDemande.get(t.demande_id) ?? [];
    list.push(row);
    tachesByDemande.set(t.demande_id, list);
  }

  const demandeRows: DemandeRow[] = (demandes.data ?? []).map((d) => ({
    id: d.id,
    clientId: d.client_id,
    clientNom: d.client_nom,
    contactEmail: d.contact_email,
    produit: d.produit,
    pays: d.pays,
    volume: d.volume,
    statut: d.statut,
    decision: d.decision,
    raison: d.raison,
    certifsRequises: d.certifs_requises ?? [],
    certifsManquantes: d.certifs_manquantes ?? [],
    packEnvoyeLe: d.pack_envoye_at,
    espaceClientCree: d.espace_client_cree,
    createdAt: d.created_at,
    taches: tachesByDemande.get(d.id) ?? [],
  }));

  return {
    demandes: demandeRows,
    coffre,
    alertes: [...alertesByType.values()].sort(
      (a, b) => a.joursRestants - b.joursRestants,
    ),
  };
}

// ── Création & qualification d'une demande ────────────────────────────────────

export interface CreateDemandeInput {
  clientNom: string;
  contactEmail?: string | null;
  produit: string;
  pays: string;
  volume?: string | null;
  clientId?: string | null;
}

export interface CreateDemandeResult {
  demandeId: string;
  match: MatchResult;
  mailSent: boolean;
  tachesCreees: number;
}

/** Journalise un email « envoyé » (mock) pour la boîte d'envoi démo. */
async function logEmailEnvoye(
  supabase: ReturnType<typeof createAdminClient>,
  row: {
    categorie: EmailCategorie;
    to: string;
    subject: string;
    body: string;
    demandeId?: string | null;
    clientId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("emails_envoyes").insert({
    categorie: row.categorie,
    to_email: row.to,
    subject: row.subject,
    body: row.body,
    demande_id: row.demandeId ?? null,
    client_id: row.clientId ?? null,
  });
  if (error) throw new Error(`Journalisation email impossible : ${error.message}`);
}

/**
 * Reçoit une demande, exécute le matching des certifications (M0c) et applique
 * la logique automatique :
 *   • suffisant → envoi (mock) du pack présentation + certifs, statut `envoyee` ;
 *   • insuffisant → création des tâches de correction, statut `en_correction`.
 * La décision + sa raison sont tracées en base (traçabilité, cf. contraintes).
 */
export async function createDemande(
  input: CreateDemandeInput,
): Promise<CreateDemandeResult> {
  const supabase = createAdminClient();

  const coffre = await loadCoffre();
  const match = matchDemande({
    produit: input.produit,
    pays: input.pays,
    clientNom: input.clientNom,
    coffre,
  });

  const suffisant = match.decision === "suffisant";
  const decision: DemandeDecision = suffisant ? "suffisant" : "insuffisant";
  const statut: DemandeStatut = suffisant ? "envoyee" : "en_correction";

  // 1) Envoi automatique du pack (mock) au vert, avant persistance du timestamp.
  const destinataire = input.contactEmail?.trim() || "contact@natural-kiss.com";
  const packSubject = `Natural Kiss — pack de présentation & certifications (${input.produit} → ${match.paysCode})`;
  const packBody =
    `Bonjour,\n\nSuite à votre demande (${input.produit} → ${match.paysCode}), ` +
    `veuillez trouver notre pack de présentation ainsi que nos certifications ` +
    `(${match.couvertes.map((t) => CERTIF_LABELS[t]).join(", ")}), toutes valides ` +
    `et couvrant ce produit / marché.\n\nBien cordialement,\nNatural Kiss`;
  let mailSent = false;
  let packEnvoyeAt: string | null = null;
  if (suffisant) {
    await getEmailProvider().send({ to: [destinataire], subject: packSubject, body: packBody });
    mailSent = true;
    packEnvoyeAt = new Date().toISOString();
  }

  // 2) Persistance de la demande (décision + raison tracées).
  const { data: inserted, error } = await supabase
    .from("demandes")
    .insert({
      client_id: input.clientId ?? null,
      client_nom: input.clientNom,
      contact_email: input.contactEmail ?? null,
      produit: input.produit,
      pays: input.pays,
      volume: input.volume ?? null,
      statut,
      decision,
      raison: match.raison,
      certifs_requises: match.requises.map((t) => CERTIF_LABELS[t]),
      certifs_manquantes: match.manquantes.map((m) => CERTIF_LABELS[m.type]),
      pack_envoye_at: packEnvoyeAt,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Création de la demande impossible : ${error.message}`);
  const demandeId = inserted.id;

  // Journalise le pack envoyé (démo : rend l'envoi automatique visible côté interne).
  if (suffisant) {
    await logEmailEnvoye(supabase, {
      categorie: "pack_certif",
      to: destinataire,
      subject: packSubject,
      body: packBody,
      demandeId,
      clientId: input.clientId ?? null,
    });
  }

  // 3) Workflow de correction si insuffisant.
  let tachesCreees = 0;
  if (!suffisant && match.manquantes.length > 0) {
    const { error: tErr } = await supabase.from("taches_correction").insert(
      match.manquantes.map((m) => ({
        demande_id: demandeId,
        certif_type: m.type as CertifType,
        produit: input.produit,
        pays: match.paysCode,
        libelle: `Obtenir/étendre ${CERTIF_LABELS[m.type]} — ${m.raison}`,
      })),
    );
    if (tErr)
      throw new Error(`Création des tâches de correction impossible : ${tErr.message}`);
    tachesCreees = match.manquantes.length;
  }

  return { demandeId, match, mailSent, tachesCreees };
}

// ── Onboarding : création de l'espace client (M2) ─────────────────────────────

export interface OnboardResult {
  clientId: string;
  userId: string;
  email: string;
  alreadyExisted: boolean;
  documentsCreated: number;
}

function slugEmail(clientNom: string): string {
  const slug = clientNom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `portail-${slug || "client"}@demo.natural-kiss.com`;
}

/** Retrouve un utilisateur Auth par email (pagination admin), sinon null. */
async function findAuthUserByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<{ id: string } | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers : ${error.message}`);
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) return { id: found.id };
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Transforme une demande qualifiée (suffisante) en client actif : crée (ou
 * réutilise) la fiche client, provisionne un utilisateur Auth du portail et le
 * rattache via `client_users` (Brique 4). Idempotent. Le portail se connecte par
 * magic link ; le mot de passe posé ici ne sert qu'aux tests.
 */
export async function onboardDemande(demandeId: string): Promise<OnboardResult> {
  const supabase = createAdminClient();

  const { data: demande, error: dErr } = await supabase
    .from("demandes")
    .select(
      "id, client_id, client_nom, contact_email, produit, pays, decision, espace_client_cree, certifs_requises",
    )
    .eq("id", demandeId)
    .maybeSingle();
  if (dErr) throw new Error(`Lecture de la demande impossible : ${dErr.message}`);
  if (!demande) throw new Error(`Demande introuvable : ${demandeId}`);
  if (demande.decision !== "suffisant") {
    throw new Error(
      "Onboarding impossible : la demande n'est pas qualifiée (décision insuffisante).",
    );
  }

  // 1) Fiche client (réutilisée si déjà rattachée).
  let clientId = demande.client_id;
  if (!clientId) {
    const { data: client, error: cErr } = await supabase
      .from("clients")
      .insert({
        nom: demande.client_nom,
        pays: demande.pays,
        contact_email: demande.contact_email,
      })
      .select("id")
      .single();
    if (cErr) throw new Error(`Création du client impossible : ${cErr.message}`);
    clientId = client.id;
  }

  // 2) Utilisateur Auth du portail (idempotent).
  const email = demande.contact_email?.trim() || slugEmail(demande.client_nom);
  let userId: string;
  let alreadyExisted = false;
  const existing = await findAuthUserByEmail(supabase, email);
  if (existing) {
    userId = existing.id;
    alreadyExisted = true;
  } else {
    const { data: created, error: uErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password: process.env.PORTAIL_DEMO_PASSWORD ?? "NaturalKiss!Demo2026",
    });
    if (uErr)
      throw new Error(`Création de l'utilisateur portail impossible : ${uErr.message}`);
    userId = created.user.id;
  }

  // 3) Liaison client_users (Brique 4).
  const { error: linkErr } = await supabase
    .from("client_users")
    .upsert(
      { client_id: clientId, user_id: userId },
      { onConflict: "client_id,user_id" },
    );
  if (linkErr) throw new Error(`Liaison client_users impossible : ${linkErr.message}`);

  // 4) Marque la demande onboardée.
  const { error: upErr } = await supabase
    .from("demandes")
    .update({ client_id: clientId, espace_client_cree: true, statut: "cloturee" })
    .eq("id", demandeId);
  if (upErr) throw new Error(`Mise à jour de la demande impossible : ${upErr.message}`);

  // 5) Documents d'onboarding + email (idempotent : une seule fois par demande).
  let documentsCreated = 0;
  if (!demande.espace_client_cree) {
    const drafts = buildOnboardingDocuments({
      clientNom: demande.client_nom,
      produit: demande.produit,
      paysCode: demande.pays,
      certifsLabels: demande.certifs_requises ?? [],
    });
    const { error: docErr } = await supabase
      .from("documents_onboarding")
      .upsert(
        drafts.map((d) => ({
          client_id: clientId,
          demande_id: demandeId,
          type: d.type,
          titre: d.titre,
          contenu_html: d.contenuHtml,
        })),
        { onConflict: "demande_id,type" },
      );
    if (docErr) throw new Error(`Création des documents impossible : ${docErr.message}`);
    documentsCreated = drafts.length;

    const onbSubject = "Natural Kiss — bienvenue & accès à votre espace client";
    const onbBody =
      `Bonjour,\n\nVotre espace client Natural Kiss est prêt. Vous y suivrez vos ` +
      `lots, documents et statuts.\n\nDocuments joints :\n` +
      drafts.map((d) => `• ${d.titre}`).join("\n") +
      `\n\nConnexion à votre espace : /portail/login\n\nBien cordialement,\nNatural Kiss`;
    await getEmailProvider().send({ to: [email], subject: onbSubject, body: onbBody });
    await logEmailEnvoye(supabase, {
      categorie: "onboarding",
      to: email,
      subject: onbSubject,
      body: onbBody,
      demandeId,
      clientId,
    });
  }

  return { clientId, userId, email, alreadyExisted, documentsCreated };
}
