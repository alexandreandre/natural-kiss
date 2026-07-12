import "server-only";

import { getDocVerifierProvider, getEmailProvider } from "@/lib/adapters";
import {
  docMetadataSchema,
  type DocAnomaly,
  type VerifierDoc,
} from "@/lib/adapters/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  computeGateStatus,
  evaluateConformite,
  isBlocking,
  type ConformiteCheck,
  type GateStatut,
} from "@/lib/gate/rules";

type DocumentTypeValue = Database["public"]["Enums"]["document_type"];
type AnomalieSeverite = Database["public"]["Enums"]["anomalie_severite"];
type ConformiteStatut = Database["public"]["Enums"]["conformite_statut"];

// ── Formes de lecture pour l'UI ──────────────────────────────────────────────

export interface GateDocumentRow {
  id: string;
  type: DocumentTypeValue;
  nomFichier: string;
  statut: Database["public"]["Enums"]["document_statut"];
  metadata: VerifierDoc["metadata"];
}

export interface GateAnomalyRow {
  id: string;
  code: string;
  champ: string | null;
  severite: AnomalieSeverite;
  message: string;
  resolue: boolean;
}

export interface GateConformiteRow {
  id: string;
  regle: string;
  libelle: string;
  statut: ConformiteStatut;
  message: string | null;
}

export interface GateJournalRow {
  id: string;
  evenement: Database["public"]["Enums"]["gate_evenement"];
  message: string | null;
  destinataire: string | null;
  createdAt: string;
}

export interface GateData {
  statut: GateStatut;
  anomaliesBloquantes: number;
  conformiteKo: number;
  mailEnvoye: boolean;
  documents: GateDocumentRow[];
  anomalies: GateAnomalyRow[];
  conformite: GateConformiteRow[];
  journal: GateJournalRow[];
}

export interface GateRunResult {
  statut: GateStatut;
  anomalies: DocAnomaly[];
  conformite: ConformiteCheck[];
  mailSent: boolean;
}

function parseDoc(row: {
  id: string;
  type: DocumentTypeValue;
  nom_fichier: string;
  metadata: unknown;
}): VerifierDoc {
  return {
    id: row.id,
    type: row.type,
    nomFichier: row.nom_fichier,
    metadata: docMetadataSchema.parse(row.metadata ?? {}),
  };
}

export interface GateOverviewRow {
  lotId: string;
  reference: string;
  produit: string;
  clientNom: string | null;
  destinationPays: string | null;
  statut: GateStatut;
}

/** Liste des lots avec leur statut de Gate (page d'aperçu /gate). */
export async function listGateOverview(): Promise<GateOverviewRow[]> {
  const supabase = createAdminClient();

  const [lots, statuses] = await Promise.all([
    supabase
      .from("lots")
      .select("id, reference, produit, destination_pays, client:clients(nom)")
      .order("reference", { ascending: true }),
    supabase.from("lot_gate_status").select("lot_id, statut"),
  ]);

  if (lots.error)
    throw new Error(`Lecture des lots impossible : ${lots.error.message}`);
  if (statuses.error) {
    throw new Error(
      `Lecture des statuts de Gate impossible : ${statuses.error.message}`,
    );
  }

  const byLot = new Map<string, GateStatut>();
  for (const s of statuses.data ?? []) {
    byLot.set(s.lot_id as string, (s.statut ?? "en_attente") as GateStatut);
  }

  return (lots.data ?? []).map((l) => ({
    lotId: l.id,
    reference: l.reference,
    produit: l.produit,
    clientNom: l.client?.nom ?? null,
    destinationPays: l.destination_pays,
    statut: byLot.get(l.id) ?? "en_attente",
  }));
}

/** Lit l'état complet de la Gate d'un lot (pour affichage). */
export async function getGateData(lotId: string): Promise<GateData> {
  const supabase = createAdminClient();

  const [documents, anomalies, conformite, journal, status] = await Promise.all([
    supabase
      .from("documents")
      .select("id, type, nom_fichier, statut, metadata")
      .eq("lot_id", lotId)
      .order("type", { ascending: true }),
    supabase
      .from("anomalies_documentaires")
      .select("id, code, champ, severite, message, resolue")
      .eq("lot_id", lotId)
      .order("severite", { ascending: false }),
    supabase
      .from("conformite_checks")
      .select("id, regle, libelle, statut, message")
      .eq("lot_id", lotId),
    supabase
      .from("gate_journal")
      .select("id, evenement, message, destinataire, created_at")
      .eq("lot_id", lotId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lot_gate_status")
      .select("statut, anomalies_bloquantes, conformite_ko, mail_envoye")
      .eq("lot_id", lotId)
      .maybeSingle(),
  ]);

  if (documents.error)
    throw new Error(`Lecture des documents impossible : ${documents.error.message}`);
  if (anomalies.error)
    throw new Error(`Lecture des anomalies impossible : ${anomalies.error.message}`);
  if (conformite.error)
    throw new Error(
      `Lecture de la conformité impossible : ${conformite.error.message}`,
    );
  if (journal.error)
    throw new Error(`Lecture du journal de Gate impossible : ${journal.error.message}`);
  if (status.error)
    throw new Error(`Lecture du statut de Gate impossible : ${status.error.message}`);

  return {
    statut: (status.data?.statut ?? "en_attente") as GateStatut,
    anomaliesBloquantes: status.data?.anomalies_bloquantes ?? 0,
    conformiteKo: status.data?.conformite_ko ?? 0,
    mailEnvoye: status.data?.mail_envoye ?? false,
    documents: (documents.data ?? []).map((d) => ({
      id: d.id,
      type: d.type,
      nomFichier: d.nom_fichier,
      statut: d.statut,
      metadata: docMetadataSchema.parse(d.metadata ?? {}),
    })),
    anomalies: (anomalies.data ?? []).map((a) => ({
      id: a.id,
      code: a.code,
      champ: a.champ,
      severite: a.severite,
      message: a.message,
      resolue: a.resolue,
    })),
    conformite: (conformite.data ?? []).map((c) => ({
      id: c.id,
      regle: c.regle,
      libelle: c.libelle,
      statut: c.statut,
      message: c.message,
    })),
    journal: (journal.data ?? []).map((j) => ({
      id: j.id,
      evenement: j.evenement,
      message: j.message,
      destinataire: j.destinataire,
      createdAt: j.created_at,
    })),
  };
}

/**
 * Exécute la vérification documentaire IA + la checklist de conformité d'un lot,
 * persiste les résultats, recalcule la Gate et — au vert — déclenche l'envoi du
 * mail (mock) au client/broker, tracé dans le journal. Idempotent.
 */
export async function runGateCheck(lotId: string): Promise<GateRunResult> {
  const supabase = createAdminClient();

  const { data: lot, error: lotErr } = await supabase
    .from("lots")
    .select(
      "id, reference, numero_conteneur, produit, destination_pays, client:clients(nom, contact_email)",
    )
    .eq("id", lotId)
    .maybeSingle();

  if (lotErr) throw new Error(`Lecture du lot impossible : ${lotErr.message}`);
  if (!lot) throw new Error(`Lot introuvable : ${lotId}`);

  const { data: docRows, error: docErr } = await supabase
    .from("documents")
    .select("id, type, nom_fichier, metadata")
    .eq("lot_id", lotId);
  if (docErr) throw new Error(`Lecture des documents impossible : ${docErr.message}`);

  const { count: preuveCount, error: preuveErr } = await supabase
    .from("preuves_produit")
    .select("id", { count: "exact", head: true })
    .eq("lot_id", lotId);
  if (preuveErr)
    throw new Error(`Lecture des preuves impossible : ${preuveErr.message}`);

  const documents = (docRows ?? []).map(parseDoc);
  const ref = lot.numero_conteneur ?? lot.reference;

  // 1) Vérificateur documentaire IA (mock déterministe → LLM réel plus tard).
  const verification = await getDocVerifierProvider().verify({ ref, documents });

  // 2) Checklist de conformité (règles pures pays/produit).
  const conformite = evaluateConformite({
    produit: lot.produit,
    destinationPays: lot.destination_pays,
    documents,
    hasPreuve: (preuveCount ?? 0) > 0,
  });

  // 3) Persistance (remplacement complet → idempotent).
  await supabase.from("anomalies_documentaires").delete().eq("lot_id", lotId);
  await supabase.from("conformite_checks").delete().eq("lot_id", lotId);

  if (verification.anomalies.length > 0) {
    const { error } = await supabase.from("anomalies_documentaires").insert(
      verification.anomalies.map((a) => ({
        lot_id: lotId,
        code: a.code,
        champ: a.champ,
        severite: a.severite as AnomalieSeverite,
        message: a.message,
        valeurs: a.valeurs,
      })),
    );
    if (error) throw new Error(`Écriture des anomalies impossible : ${error.message}`);
  }

  const { error: confErr } = await supabase.from("conformite_checks").insert(
    conformite.map((c) => ({
      lot_id: lotId,
      regle: c.regle,
      libelle: c.libelle,
      statut: c.statut as ConformiteStatut,
      message: c.message,
    })),
  );
  if (confErr)
    throw new Error(`Écriture de la conformité impossible : ${confErr.message}`);

  // 4) Statut par document (anomalie si impliqué dans une divergence).
  const impliques = new Set<string>();
  for (const a of verification.anomalies) {
    for (const s of a.valeurs.sources ?? []) impliques.add(s);
  }
  const anomalieTypes = [...impliques] as DocumentTypeValue[];
  if (anomalieTypes.length > 0) {
    await supabase
      .from("documents")
      .update({ statut: "anomalie" })
      .eq("lot_id", lotId)
      .in("type", anomalieTypes);
    await supabase
      .from("documents")
      .update({ statut: "verifie" })
      .eq("lot_id", lotId)
      .not("type", "in", `(${anomalieTypes.join(",")})`);
  } else {
    await supabase.from("documents").update({ statut: "verifie" }).eq("lot_id", lotId);
  }

  // 5) Statut de Gate + déclenchement mail (mock) au vert.
  const unresolved = verification.anomalies.filter((a) => isBlocking(a));
  const statut = computeGateStatus(unresolved, conformite);

  let mailSent = false;
  if (statut === "vert") {
    const { count: already } = await supabase
      .from("gate_journal")
      .select("id", { count: "exact", head: true })
      .eq("lot_id", lotId)
      .eq("evenement", "mail_envoye");

    if ((already ?? 0) === 0) {
      const destinataire = lot.client?.contact_email ?? null;
      await getEmailProvider().send({
        to: destinataire ? [destinataire] : ["broker@natural-kiss.com"],
        subject: `Check OK — dossier conforme ${lot.reference} (${ref})`,
        body:
          `Le dossier documentaire du lot ${lot.reference} est complet et conforme. ` +
          `Documents et conformité validés — expédition autorisée.`,
      });
      await supabase.from("gate_journal").insert([
        {
          lot_id: lotId,
          evenement: "check_ok",
          message: "Gate au vert : documents complets + conformité validée.",
        },
        {
          lot_id: lotId,
          evenement: "mail_envoye",
          message: `Mail « Check OK » envoyé (mock) pour ${lot.reference}.`,
          destinataire,
        },
      ]);
      mailSent = true;
    }
  }

  return { statut, anomalies: verification.anomalies, conformite, mailSent };
}
