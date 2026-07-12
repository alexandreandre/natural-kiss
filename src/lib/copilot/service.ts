import "server-only";

import { getEmailProvider, getLlmProvider } from "@/lib/adapters";
import { extractRefs, matchLot, type LotRef } from "@/lib/qualite/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateInstructionSheet,
  generateThreadReply,
  groupThreads,
  summarizeThread,
  type DocumentKind,
  type EmailThread,
  type ThreadSummary,
} from "@/lib/copilot/rules";

export interface ThreadListItem {
  key: string;
  subject: string;
  messageCount: number;
  lastReceivedAt: string;
  lotId: string | null;
  lotReference: string | null;
}

/** Liste des fils d'emails (regroupés par sujet), avec le lot rattaché si résolu. */
export async function listThreads(): Promise<ThreadListItem[]> {
  const supabase = createAdminClient();
  const [messages, lots] = await Promise.all([
    getEmailProvider().listInbox(),
    supabase.from("lots").select("id, reference, numero_conteneur"),
  ]);
  if (lots.error) throw new Error(`Lecture des lots impossible : ${lots.error.message}`);

  const lotRefs: LotRef[] = (lots.data ?? []).map((l) => ({
    id: l.id,
    reference: l.reference,
    numeroConteneur: l.numero_conteneur,
  }));

  return groupThreads(messages).map((t) => {
    const lotId = matchLot(
      extractRefs(t.messages.map((m) => m.subject).join(" ")),
      lotRefs,
    );
    return {
      key: t.key,
      subject: t.subject,
      messageCount: t.messages.length,
      lastReceivedAt: t.messages[t.messages.length - 1]!.receivedAt,
      lotId,
      lotReference: lotRefs.find((l) => l.id === lotId)?.reference ?? null,
    };
  });
}

async function getThread(threadKey: string): Promise<EmailThread | null> {
  const messages = await getEmailProvider().listInbox();
  const thread = groupThreads(messages).find((t) => t.key === threadKey);
  return thread ?? null;
}

export interface ThreadSummaryResult {
  summary: ThreadSummary;
  draftReply: string;
  model: string;
}

/**
 * Résume un fil d'emails + génère un brouillon de réponse. La synthèse est
 * calculée par une fonction pure et déterministe (`summarizeThread`) ; l'appel
 * au `LlmProvider` sert uniquement à l'attribution du modèle (mock → réel,
 * sans changer la logique consommatrice).
 */
export async function summarizeEmailThread(threadKey: string): Promise<ThreadSummaryResult | null> {
  const thread = await getThread(threadKey);
  if (!thread) return null;

  const summary = summarizeThread(thread);
  const completion = await getLlmProvider().complete(
    `Résume ce fil d'emails et propose une réponse :\n${summary.resume}`,
  );

  return {
    summary,
    draftReply: generateThreadReply(thread, summary),
    model: completion.model,
  };
}

export interface GenerateDocumentResult {
  content: string;
  model: string;
}

/** Génère un document type (instruction sheet ou réponse) pour un lot. */
export async function generateDocument(
  kind: DocumentKind,
  lotId: string,
  threadKey?: string,
): Promise<GenerateDocumentResult> {
  const supabase = createAdminClient();
  const { data: lot, error } = await supabase
    .from("lots")
    .select("reference, produit, variete, numero_conteneur, destination_pays, client:clients(nom)")
    .eq("id", lotId)
    .maybeSingle();
  if (error) throw new Error(`Lecture du lot impossible : ${error.message}`);
  if (!lot) throw new Error(`Lot introuvable : ${lotId}`);

  let content: string;
  if (kind === "instruction_sheet") {
    content = generateInstructionSheet({
      lotReference: lot.reference,
      produit: lot.produit,
      variete: lot.variete,
      clientNom: lot.client?.nom ?? null,
      destinationPays: lot.destination_pays,
      numeroConteneur: lot.numero_conteneur,
    });
  } else {
    const thread = threadKey ? await getThread(threadKey) : null;
    if (!thread) throw new Error("Fil d'emails introuvable pour générer la réponse.");
    content = generateThreadReply(thread, summarizeThread(thread));
  }

  const completion = await getLlmProvider().complete(
    `Génère un document "${kind}" pour le lot ${lot.reference}.`,
  );

  return { content, model: completion.model };
}
