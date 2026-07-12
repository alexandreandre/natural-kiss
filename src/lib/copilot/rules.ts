import type { EmailMessage } from "@/lib/adapters/types";

/**
 * T4 — Copilot IA (Brique 8) : logique **pure** de regroupement en fils et de
 * synthèse/génération de documents — sans base ni réseau, donc testable. Le
 * mock est déterministe par construction (pas de dépendance au texte renvoyé
 * par `LlmProvider`, qui n'est qu'un écho) ; le vrai LLM produira le même
 * texte de sortie via un prompt construit à partir des mêmes données.
 */

/** Retire les préfixes de réponse/transfert (Re:, Fwd:, Tr:…), répétés. */
export function normalizeSubject(subject: string): string {
  let s = subject.trim();
  const prefix = /^(re|fwd?|tr)\s*:\s*/i;
  while (prefix.test(s)) s = s.replace(prefix, "").trim();
  return s;
}

export interface EmailThread {
  key: string;
  subject: string;
  messages: EmailMessage[];
}

/** Regroupe les mails en fils par sujet normalisé, triés chronologiquement. */
export function groupThreads(messages: EmailMessage[]): EmailThread[] {
  const byKey = new Map<string, EmailMessage[]>();
  for (const m of messages) {
    const key = normalizeSubject(m.subject).toUpperCase();
    const arr = byKey.get(key) ?? [];
    arr.push(m);
    byKey.set(key, arr);
  }

  return [...byKey.entries()]
    .map(([key, msgs]) => {
      const sorted = [...msgs].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
      return { key, subject: normalizeSubject(sorted[0]!.subject), messages: sorted };
    })
    .sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]!.receivedAt;
      const bLast = b.messages[b.messages.length - 1]!.receivedAt;
      return bLast.localeCompare(aLast);
    });
}

/** Mots-clés déclenchant une action de suivi dans le résumé (bilingue). */
const ACTION_KEYWORDS: { pattern: RegExp; action: string }[] = [
  {
    pattern: /quarantaine|d[ée]tention|thrips|bemisia/i,
    action: "Lever le blocage phytosanitaire / la détention douanière.",
  },
  {
    pattern: /litige|conteste|contestation|retenu|retient/i,
    action: "Résoudre le litige financier (documents retenus).",
  },
  {
    pattern: /instruction sheet|quantit[ée]/i,
    action: "Confirmer les quantités et l'instruction sheet.",
  },
  { pattern: /facture|invoice/i, action: "Vérifier la cohérence de la facture." },
];

export interface ThreadSummary {
  resume: string;
  actions: string[];
  participants: string[];
  messageCount: number;
}

/** Synthèse déterministe d'un fil (sujet, participants, points clés, actions). */
export function summarizeThread(thread: EmailThread): ThreadSummary {
  const { subject, messages } = thread;
  const participants = [...new Set(messages.flatMap((m) => [m.from, ...m.to]))];

  const points = messages.map(
    (m) => `${m.from} (${m.receivedAt.slice(0, 10)}) : ${m.snippet}`,
  );
  const resume =
    `Fil « ${subject} » — ${messages.length} message(s) entre ${messages[0]!.receivedAt.slice(0, 10)} ` +
    `et ${messages[messages.length - 1]!.receivedAt.slice(0, 10)}.\n` +
    points.join("\n");

  const text = messages.map((m) => `${m.subject} ${m.snippet}`).join(" ");
  const actions = ACTION_KEYWORDS.filter((k) => k.pattern.test(text)).map(
    (k) => k.action,
  );

  return { resume, actions, participants, messageCount: messages.length };
}

export type DocumentKind = "instruction_sheet" | "reponse";

export interface InstructionSheetContext {
  lotReference: string;
  produit: string;
  variete: string | null;
  clientNom: string | null;
  destinationPays: string | null;
  numeroConteneur: string | null;
}

/** Génère une instruction sheet type (quantités/transport) pour un lot. */
export function generateInstructionSheet(ctx: InstructionSheetContext): string {
  return [
    `INSTRUCTION SHEET — ${ctx.lotReference}`,
    `Produit : ${ctx.produit}${ctx.variete ? ` (${ctx.variete})` : ""}`,
    `Client : ${ctx.clientNom ?? "—"}`,
    `Destination : ${ctx.destinationPays ?? "—"}`,
    `Conteneur / réf. transport : ${ctx.numeroConteneur ?? "à confirmer"}`,
    "",
    "Merci de confirmer les quantités, le créneau de chargement et les coordonnées du destinataire avant cut-off documentaire.",
  ].join("\n");
}

/** Génère un brouillon de réponse au dernier message d'un fil. */
export function generateThreadReply(
  thread: EmailThread,
  summary: ThreadSummary,
): string {
  const last = thread.messages[thread.messages.length - 1]!;
  const actionLines =
    summary.actions.length > 0
      ? summary.actions.map((a) => `- ${a}`)
      : ["- Aucune action bloquante identifiée."];
  return [
    `Objet : RE: ${thread.subject}`,
    `À : ${last.from}`,
    "",
    `Bonjour,`,
    "",
    `Merci pour votre message du ${last.receivedAt.slice(0, 10)}. Nous revenons vers vous sur les points suivants :`,
    ...actionLines,
    "",
    "Cordialement,",
    "Natural Kiss",
  ].join("\n");
}
