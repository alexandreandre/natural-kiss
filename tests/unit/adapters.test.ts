import { afterEach, describe, expect, it } from "vitest";

import {
  bookingConfirmationExtractSchema,
  docVerificationSchema,
  getBookingConfirmationProvider,
  getDocVerifierProvider,
  getEmailProvider,
  getFieldTraceProvider,
  getLlmProvider,
  getSensorProvider,
  getTrackingProvider,
  sensorReadingSchema,
  trackingEventSchema,
} from "@/lib/adapters";
import type { VerifierDoc } from "@/lib/adapters/types";

describe("TrackingProvider (mock)", () => {
  const tracking = getTrackingProvider();

  it("renvoie une timeline validée pour un conteneur connu", async () => {
    const events = await tracking.getTimeline("CAAU4027760");
    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events[0]?.code).toBe("booking");
    // Chaque événement respecte le schéma Zod (frontière).
    for (const e of events) expect(() => trackingEventSchema.parse(e)).not.toThrow();
  });

  it("renvoie une position (ref normalisée en majuscules)", async () => {
    const pos = await tracking.getPosition("caau4027760");
    expect(pos).not.toBeNull();
    expect(pos?.ref).toBe("CAAU4027760");
  });

  it("gère une référence vide", async () => {
    expect(await tracking.getTimeline("")).toEqual([]);
    expect(await tracking.getPosition("  ")).toBeNull();
  });
});

describe("SensorProvider (mock)", () => {
  const sensor = getSensorProvider();

  it("est déterministe (même ref ⇒ même série)", async () => {
    const a = await sensor.getSeries("CAAU4027760");
    const b = await sensor.getSeries("CAAU4027760");
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(10);
    for (const r of a) expect(() => sensorReadingSchema.parse(r)).not.toThrow();
  });

  it("montre une excursion de température sur le lot maritime « fatigué »", async () => {
    const series = await sensor.getSeries("OLMP2605160");
    const max = Math.max(...series.map((r) => r.tempC));
    expect(max).toBeGreaterThan(8); // consigne -0.5°C → pic anormal
  });
});

describe("EmailProvider (mock)", () => {
  const email = getEmailProvider();

  it("liste une boîte de réception validée avec pièces jointes", async () => {
    const inbox = await email.listInbox();
    expect(inbox.length).toBeGreaterThan(0);
    expect(
      inbox.some((m) => m.attachments.some((a) => a.filename.endsWith(".pdf"))),
    ).toBe(true);
  });

  it("accepte un envoi (mock)", async () => {
    const res = await email.send({
      to: ["client@x.com"],
      subject: "Check OK",
      body: "…",
    });
    expect(res.accepted).toBe(true);
  });
});

describe("FieldTrace & Llm (mock)", () => {
  it("FieldTrace renvoie une origine validée", async () => {
    const trace = await getFieldTraceProvider().getTrace("CAAU4027760");
    expect(trace?.site).toContain("Al Batoul");
  });

  it("Llm est déterministe", async () => {
    const llm = getLlmProvider();
    const a = await llm.complete("cohérence documentaire ?");
    const b = await llm.complete("cohérence documentaire ?");
    expect(a).toEqual(b);
  });
});

describe("DocVerifier (mock)", () => {
  const verifier = getDocVerifierProvider();
  const docs: VerifierDoc[] = [
    {
      id: "1",
      type: "facture",
      nomFichier: "inv.pdf",
      metadata: { numeroConteneur: "OTPU6220580" },
    },
    {
      id: "2",
      type: "bl",
      nomFichier: "bl.pdf",
      metadata: { numeroConteneur: "OTPU6220589" },
    },
  ];

  it("produit une sortie validée par Zod, déterministe", async () => {
    const a = await verifier.verify({ ref: "OTPU6220580", documents: docs });
    const b = await verifier.verify({ ref: "OTPU6220580", documents: docs });
    expect(a).toEqual(b);
    expect(() => docVerificationSchema.parse(a)).not.toThrow();
    expect(a.anomalies.some((x) => x.code === "conteneur_incoherent")).toBe(true);
  });
});

describe("BookingConfirmation (mock)", () => {
  const parser = getBookingConfirmationProvider();

  it("extrait n° conteneur, transporteur et date depuis un mail de confirmation", async () => {
    const extract = await parser.parseConfirmation(
      "Bonjour, confirmation de votre booking DFDS (Olympos Seaways) : conteneur OTPU6220580, départ prévu 2026-07-17.",
    );
    expect(() => bookingConfirmationExtractSchema.parse(extract)).not.toThrow();
    expect(extract.numeroConteneur).toBe("OTPU6220580");
    expect(extract.transporteurNom).toContain("DFDS");
    expect(extract.dateDepart).toBe("2026-07-17");
    expect(extract.mode).toBe("roro");
  });

  it("tolère un texte sans repère connu (champs null)", async () => {
    const extract = await parser.parseConfirmation("Merci de votre patience.");
    expect(extract.numeroConteneur).toBeNull();
    expect(extract.transporteurNom).toBeNull();
    expect(extract.mode).toBeNull();
  });
});

describe("Fabrique d'adaptateurs — bascule mock/réel", () => {
  afterEach(() => {
    delete process.env.NK_TRACKING_PROVIDER;
    delete process.env.NK_LLM_PROVIDER;
  });

  it("lève une erreur claire si on demande le réel non implémenté", () => {
    process.env.NK_TRACKING_PROVIDER = "real";
    expect(() => getTrackingProvider()).toThrowError(/non implémenté/);
  });

  it("le vérificateur documentaire bascule aussi en réel (non implémenté)", () => {
    process.env.NK_LLM_PROVIDER = "real";
    expect(() => getDocVerifierProvider()).toThrowError(/non implémenté/);
  });
});
