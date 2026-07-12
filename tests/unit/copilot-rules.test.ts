import { describe, expect, it } from "vitest";

import type { EmailMessage } from "@/lib/adapters/types";
import {
  generateInstructionSheet,
  generateThreadReply,
  groupThreads,
  normalizeSubject,
  summarizeThread,
} from "@/lib/copilot/rules";

function msg(overrides: Partial<EmailMessage>): EmailMessage {
  return {
    id: "id",
    from: "a@example.com",
    to: ["b@example.com"],
    subject: "Subject",
    receivedAt: "2026-05-01T00:00:00Z",
    snippet: "snippet",
    attachments: [],
    ...overrides,
  };
}

describe("normalizeSubject", () => {
  it("retire les préfixes Re:/Fwd:/Tr: répétés", () => {
    expect(normalizeSubject("RE: Fwd: Tr: Sujet")).toBe("Sujet");
    expect(normalizeSubject("Sujet simple")).toBe("Sujet simple");
  });
});

describe("groupThreads", () => {
  it("regroupe par sujet normalisé, triés chronologiquement", () => {
    const messages = [
      msg({ id: "1", subject: "RE: Voltz slips", receivedAt: "2026-06-01T00:00:00Z" }),
      msg({ id: "2", subject: "Voltz slips", receivedAt: "2026-05-13T00:00:00Z" }),
      msg({ id: "3", subject: "Autre sujet", receivedAt: "2026-05-20T00:00:00Z" }),
    ];
    const threads = groupThreads(messages);
    expect(threads).toHaveLength(2);
    const voltz = threads.find((t) => t.subject === "Voltz slips");
    expect(voltz?.messages.map((m) => m.id)).toEqual(["2", "1"]);
  });
});

describe("summarizeThread", () => {
  it("détecte les actions à partir des mots-clés (cas Voltz : quarantaine + litige)", () => {
    const messages = [
      msg({
        id: "1",
        subject: "Instruction sheet Voltz",
        snippet: "Merci de confirmer les quantités.",
        receivedAt: "2026-05-13T00:00:00Z",
      }),
      msg({
        id: "2",
        subject: "RE: Instruction sheet Voltz",
        snippet: "Détention douanière : thrips détectés, quarantaine.",
        receivedAt: "2026-05-29T00:00:00Z",
      }),
      msg({
        id: "3",
        subject: "RE: Instruction sheet Voltz",
        snippet: "Voltz conteste la facture et retient les documents.",
        receivedAt: "2026-06-01T00:00:00Z",
      }),
    ];
    const thread = groupThreads(messages)[0]!;
    const summary = summarizeThread(thread);
    expect(summary.messageCount).toBe(3);
    expect(summary.actions.some((a) => /quarantaine|détention/i.test(a))).toBe(true);
    expect(summary.actions.some((a) => /litige/i.test(a))).toBe(true);
  });

  it("aucun mot-clé → aucune action suggérée", () => {
    const thread = groupThreads([msg({ subject: "Bonjour", snippet: "Merci beaucoup." })])[0]!;
    expect(summarizeThread(thread).actions).toEqual([]);
  });
});

describe("generateInstructionSheet", () => {
  it("inclut les champs clés du lot", () => {
    const sheet = generateInstructionSheet({
      lotReference: "LOT-2026-0004",
      produit: "Plants patate douce (slips)",
      variete: "Bellevue",
      clientNom: "Graines Voltz SAS",
      destinationPays: "FR",
      numeroConteneur: "OTPU6220580",
    });
    expect(sheet).toContain("LOT-2026-0004");
    expect(sheet).toContain("Graines Voltz SAS");
    expect(sheet).toContain("OTPU6220580");
  });
});

describe("generateThreadReply", () => {
  it("liste les actions dans le brouillon, sinon un message par défaut", () => {
    const thread = groupThreads([
      msg({ subject: "Sujet", from: "client@example.com" }),
    ])[0]!;
    const summary = summarizeThread(thread);
    const reply = generateThreadReply(thread, summary);
    expect(reply).toContain("client@example.com");
    expect(reply).toContain("Aucune action bloquante identifiée.");
  });
});
