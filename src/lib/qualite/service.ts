import "server-only";

import { getEmailProvider, getQcAnalyzerProvider } from "@/lib/adapters";
import { qcAnalysisSchema, type QcAnalysis } from "@/lib/adapters/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  aggregateTrends,
  extractRefs,
  matchLot,
  type LotRef,
  type QcTrendReport,
  type QualiteTrends,
} from "@/lib/qualite/rules";

type QualiteImportStatut = Database["public"]["Enums"]["qualite_import_statut"];

// ── Hub email : boîte de réception des retours qualité (T2) ───────────────────

export interface InboxItem {
  emailId: string;
  from: string;
  subject: string;
  receivedAt: string;
  snippet: string;
  pdfFilename: string | null;
  /** Déjà importé ? (idempotence de l'import). */
  imported: boolean;
  importStatut: QualiteImportStatut | null;
  /** Lot rattaché (aperçu) si résolu / déjà importé. */
  lotId: string | null;
  lotReference: string | null;
}

function firstPdf(
  attachments: { filename: string; contentType: string }[],
): string | null {
  const pdf = attachments.find(
    (a) =>
      a.contentType === "application/pdf" || a.filename.toLowerCase().endsWith(".pdf"),
  );
  return pdf?.filename ?? null;
}

/**
 * Boîte de réception (mock `EmailProvider`) enrichie de l'état d'import : quels
 * mails portent un PDF de retour, lesquels sont déjà rattachés à un lot.
 */
export async function listQualiteInbox(): Promise<InboxItem[]> {
  const supabase = createAdminClient();
  const [messages, imports, lots] = await Promise.all([
    getEmailProvider().listInbox(),
    supabase
      .from("qualite_imports")
      .select("email_id, statut, lot_id, lots(reference)"),
    supabase.from("lots").select("id, reference, numero_conteneur"),
  ]);

  if (imports.error)
    throw new Error(
      `Lecture des imports qualité impossible : ${imports.error.message}`,
    );
  if (lots.error)
    throw new Error(`Lecture des lots impossible : ${lots.error.message}`);

  const importByEmail = new Map(
    (imports.data ?? []).map((i) => [
      i.email_id,
      {
        statut: i.statut,
        lotId: i.lot_id,
        lotReference: (i.lots as { reference: string } | null)?.reference ?? null,
      },
    ]),
  );
  const lotRefs: LotRef[] = (lots.data ?? []).map((l) => ({
    id: l.id,
    reference: l.reference,
    numeroConteneur: l.numero_conteneur,
  }));
  const lotById = new Map(lotRefs.map((l) => [l.id, l.reference]));

  return messages
    .map((m) => {
      const pdfFilename = firstPdf(m.attachments);
      const existing = importByEmail.get(m.id);
      // Aperçu du rattachement (sujet + nom du fichier) avant import.
      const previewLotId =
        existing?.lotId ??
        (pdfFilename
          ? matchLot(extractRefs(`${m.subject} ${pdfFilename}`), lotRefs)
          : null);
      return {
        emailId: m.id,
        from: m.from,
        subject: m.subject,
        receivedAt: m.receivedAt,
        snippet: m.snippet,
        pdfFilename,
        imported: Boolean(existing),
        importStatut: existing?.statut ?? null,
        lotId: previewLotId,
        lotReference:
          existing?.lotReference ??
          (previewLotId ? (lotById.get(previewLotId) ?? null) : null),
      };
    })
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

// ── Import d'un mail : PDF → rattachement lot → analyse IA → rapport ──────────

export interface ImportQcResult {
  ok: boolean;
  statut: QualiteImportStatut;
  lotId: string | null;
  lotReference: string | null;
  analysis: QcAnalysis | null;
  message?: string;
}

/**
 * Importe le PDF de retour d'un mail (mock `EmailProvider`) : le rattache au lot
 * (par n° de conteneur / réf. dans le sujet ou le nom du fichier), l'analyse par
 * IA (`QcAnalyzerProvider`) et persiste un `RapportQualite` structuré. Idempotent
 * (clé `email_id`), tracé dans `qualite_imports`.
 */
export async function importEmailQC(emailId: string): Promise<ImportQcResult> {
  const supabase = createAdminClient();

  const messages = await getEmailProvider().listInbox();
  const mail = messages.find((m) => m.id === emailId);
  if (!mail) throw new Error(`Mail introuvable : ${emailId}`);

  const pdfFilename = firstPdf(mail.attachments);
  if (!pdfFilename) {
    const res: ImportQcResult = {
      ok: false,
      statut: "erreur",
      lotId: null,
      lotReference: null,
      analysis: null,
      message: "Aucune pièce jointe PDF dans ce mail.",
    };
    await recordImport(
      supabase,
      mail,
      pdfFilename ?? "—",
      null,
      null,
      res.statut,
      res.message ?? null,
    );
    return res;
  }

  // 1) Rattachement au lot (n° conteneur / réf. dans sujet + nom de fichier).
  const { data: lotRows, error: lotErr } = await supabase
    .from("lots")
    .select("id, reference, numero_conteneur, produit");
  if (lotErr) throw new Error(`Lecture des lots impossible : ${lotErr.message}`);

  const lotRefs: LotRef[] = (lotRows ?? []).map((l) => ({
    id: l.id,
    reference: l.reference,
    numeroConteneur: l.numero_conteneur,
  }));
  const lotId = matchLot(extractRefs(`${mail.subject} ${pdfFilename}`), lotRefs);
  const lot = lotRows?.find((l) => l.id === lotId) ?? null;

  if (!lot) {
    const res: ImportQcResult = {
      ok: false,
      statut: "non_rattache",
      lotId: null,
      lotReference: null,
      analysis: null,
      message: "PDF importé mais aucun lot ne correspond (n° conteneur / référence).",
    };
    await recordImport(
      supabase,
      mail,
      pdfFilename,
      null,
      null,
      res.statut,
      res.message ?? null,
    );
    return res;
  }

  // 2) Analyse IA du PDF (mock déterministe → LLM réel).
  const analysis = qcAnalysisSchema.parse(
    await getQcAnalyzerProvider().analyze({
      filename: pdfFilename,
      produit: lot.produit,
      ref: lot.numero_conteneur ?? lot.reference,
    }),
  );

  // 3) Persistance du rapport qualité (upsert idempotent par email_id).
  const rapportId = await upsertRapport(supabase, {
    emailId: mail.id,
    lotId: lot.id,
    filename: pdfFilename,
    receivedAt: mail.receivedAt,
    analysis,
  });

  await recordImport(supabase, mail, pdfFilename, lot.id, rapportId, "rattache", null);

  return {
    ok: true,
    statut: "rattache",
    lotId: lot.id,
    lotReference: lot.reference,
    analysis,
    message: `Retour analysé (${analysis.verdict}, score ${analysis.score}) et rattaché à ${lot.reference}.`,
  };
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function upsertRapport(
  supabase: AdminClient,
  input: {
    emailId: string;
    lotId: string;
    filename: string;
    receivedAt: string;
    analysis: QcAnalysis;
  },
): Promise<string> {
  const { emailId, lotId, filename, receivedAt, analysis } = input;
  const row = {
    lot_id: lotId,
    source: "retour_client" as const,
    verdict: analysis.verdict,
    score: analysis.score,
    defauts: analysis.defauts.map((d) => d.libelle),
    recu_le: receivedAt.slice(0, 10),
    storage_path: `retours-qc/${filename}`,
    email_id: emailId,
    nom_fichier: filename,
    resume: analysis.resume,
    analyse_ia:
      analysis as unknown as Database["public"]["Tables"]["rapports_qualite"]["Insert"]["analyse_ia"],
    model: analysis.model,
    analyse_le: new Date().toISOString(),
  };

  const { data: existing, error: selErr } = await supabase
    .from("rapports_qualite")
    .select("id")
    .eq("email_id", emailId)
    .maybeSingle();
  if (selErr) throw new Error(`Lecture du rapport impossible : ${selErr.message}`);

  if (existing) {
    const { error } = await supabase
      .from("rapports_qualite")
      .update(row)
      .eq("id", existing.id);
    if (error) throw new Error(`Mise à jour du rapport impossible : ${error.message}`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("rapports_qualite")
    .insert(row)
    .select("id")
    .single();
  if (error) throw new Error(`Écriture du rapport impossible : ${error.message}`);
  return data.id;
}

async function recordImport(
  supabase: AdminClient,
  mail: { id: string; from: string; subject: string; receivedAt: string },
  filename: string,
  lotId: string | null,
  rapportId: string | null,
  statut: QualiteImportStatut,
  message: string | null,
): Promise<void> {
  const { error } = await supabase.from("qualite_imports").upsert(
    {
      email_id: mail.id,
      expediteur: mail.from,
      sujet: mail.subject,
      recu_le: mail.receivedAt,
      nom_fichier: filename,
      lot_id: lotId,
      rapport_id: rapportId,
      statut,
      message,
    },
    { onConflict: "email_id" },
  );
  if (error) throw new Error(`Traçage de l'import impossible : ${error.message}`);
}

// ── Analyse d'un rapport (fiche lot) + comparaison départ / retour ────────────

export interface QcReportDetail {
  id: string;
  source: Database["public"]["Enums"]["qc_source"];
  verdict: Database["public"]["Enums"]["qc_verdict"];
  score: number | null;
  recuLe: string | null;
  nomFichier: string | null;
  resume: string | null;
  analyse: QcAnalysis | null;
}

export interface QcComparison {
  departPhoto: { storagePath: string | null; priseLe: string | null } | null;
  retour: QcReportDetail | null;
}

function parseAnalyse(value: unknown): QcAnalysis | null {
  const parsed = qcAnalysisSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Compare la preuve « boîte départ » (Brique 4) au retour qualité analysé. */
export async function getLotQcComparison(lotId: string): Promise<QcComparison> {
  const supabase = createAdminClient();
  const [preuve, retour] = await Promise.all([
    supabase
      .from("preuves_produit")
      .select("storage_path, prise_le")
      .eq("lot_id", lotId)
      .eq("type", "photo_boite")
      .order("prise_le", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("rapports_qualite")
      .select("id, source, verdict, score, recu_le, nom_fichier, resume, analyse_ia")
      .eq("lot_id", lotId)
      .eq("source", "retour_client")
      .order("recu_le", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (preuve.error)
    throw new Error(`Lecture de la preuve impossible : ${preuve.error.message}`);
  if (retour.error)
    throw new Error(`Lecture du retour impossible : ${retour.error.message}`);

  return {
    departPhoto: preuve.data
      ? { storagePath: preuve.data.storage_path, priseLe: preuve.data.prise_le }
      : null,
    retour: retour.data
      ? {
          id: retour.data.id,
          source: retour.data.source,
          verdict: retour.data.verdict,
          score: retour.data.score,
          recuLe: retour.data.recu_le,
          nomFichier: retour.data.nom_fichier,
          resume: retour.data.resume,
          analyse: parseAnalyse(retour.data.analyse_ia),
        }
      : null,
  };
}

// ── Tendances qualité (par produit / client / site) ──────────────────────────

/** Agrège toutes les analyses qualité en tendances (produit / client / site). */
export async function getQualiteTrends(): Promise<QualiteTrends> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rapports_qualite")
    .select(
      "verdict, score, analyse_ia, lot:lots(produit, client:clients(nom), origines(site))",
    )
    .eq("source", "retour_client");

  if (error) throw new Error(`Lecture des tendances impossible : ${error.message}`);

  const reports: QcTrendReport[] = (data ?? []).map((r) => {
    const lot = r.lot as {
      produit: string;
      client: { nom: string } | null;
      origines: { site: string }[] | null;
    } | null;
    const analyse = parseAnalyse(r.analyse_ia);
    return {
      produit: lot?.produit ?? "—",
      clientNom: lot?.client?.nom ?? null,
      site: lot?.origines?.[0]?.site ?? null,
      verdict: r.verdict,
      score: r.score,
      defauts:
        analyse?.defauts.map((d) => ({
          code: d.code,
          libelle: d.libelle,
          categorie: d.categorie,
          severite: d.severite,
        })) ?? [],
    };
  });

  return aggregateTrends(reports);
}
