import { afterEach, describe, expect, it } from "vitest";

import {
  getEmailProvider,
  getFieldTraceProvider,
  getLlmProvider,
  getSensorProvider,
  getTrackingProvider,
  sensorReadingSchema,
  trackingEventSchema,
} from "@/lib/adapters";

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

describe("Fabrique d'adaptateurs — bascule mock/réel", () => {
  afterEach(() => {
    delete process.env.NK_TRACKING_PROVIDER;
  });

  it("lève une erreur claire si on demande le réel non implémenté", () => {
    process.env.NK_TRACKING_PROVIDER = "real";
    expect(() => getTrackingProvider()).toThrowError(/non implémenté/);
  });
});
