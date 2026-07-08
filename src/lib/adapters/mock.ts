import {
  type EmailMessage,
  type EmailProvider,
  type FieldTrace,
  type FieldTraceProvider,
  type LlmCompletion,
  type LlmProvider,
  type SendEmailResult,
  type SensorProvider,
  type SensorReading,
  type TrackingEvent,
  type TrackingProvider,
  type VesselPosition,
  emailMessageSchema,
  fieldTraceSchema,
  llmCompletionSchema,
  sendEmailResultSchema,
  sensorReadingSchema,
  trackingEventSchema,
  vesselPositionSchema,
} from "@/lib/adapters/types";

/**
 * Implémentations MOCK des adaptateurs — données calquées sur la base de
 * connaissance (Barfoots RoRo Damietta→Trieste→UK, patate douce → Marseille,
 * lot maritime "fatigué", slips Voltz). Déterministes → tests reproductibles.
 *
 * Toutes les sorties sont validées par leur schéma Zod avant d'être renvoyées.
 */

// PRNG déterministe (mulberry32) : même `ref` ⇒ même série.
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashRef(ref: string): number {
  let h = 2166136261;
  for (let i = 0; i < ref.length; i++) {
    h ^= ref.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface Route {
  mode: VesselPosition["mode"];
  timeline: TrackingEvent[];
  position: Omit<VesselPosition, "ref">;
  /** Excursion de température simulée (lot "fatigué"). */
  excursion?: boolean;
  targetTempC: number;
}

const HELFER_MARSEILLE: Route = {
  mode: "sea",
  targetTempC: 6,
  timeline: [
    {
      code: "booking",
      label: "Booking MSC/Borchard",
      at: "2026-03-14T08:00:00+02:00",
      location: "Damietta, EG",
      mode: "sea",
    },
    {
      code: "loading",
      label: "Chargement 40'RF",
      at: "2026-03-15T14:00:00+02:00",
      location: "Damietta, EG",
      mode: "sea",
    },
    {
      code: "departure",
      label: "Départ navire",
      at: "2026-03-16T22:00:00+02:00",
      location: "Damietta, EG",
      mode: "sea",
    },
    {
      code: "transit",
      label: "En mer (Méditerranée)",
      at: "2026-03-19T10:00:00+02:00",
      location: "Mer Méditerranée",
      mode: "sea",
    },
    {
      code: "arrival",
      label: "Arrivée port",
      at: "2026-03-23T07:00:00+01:00",
      location: "Marseille/Fos, FR",
      mode: "sea",
    },
    {
      code: "delivery",
      label: "Livraison Rungis (G. Helfer)",
      at: "2026-03-24T09:00:00+01:00",
      location: "Rungis, FR",
      mode: "road",
    },
  ],
  position: {
    mode: "sea",
    position: {
      lat: 37.5,
      lng: 15.1,
      at: "2026-03-19T10:00:00+02:00",
      label: "Détroit de Messine",
    },
    speedKn: 16.4,
    headingDeg: 300,
    etaAt: "2026-03-23T07:00:00+01:00",
  },
};

const BIMI_RORO_FATIGUE: Route = {
  mode: "roro",
  targetTempC: -0.5,
  excursion: true,
  timeline: [
    {
      code: "booking",
      label: "Booking DFDS (Olympos Seaways)",
      at: "2026-05-15T09:00:00+02:00",
      location: "Damietta, EG",
      mode: "roro",
    },
    {
      code: "loading",
      label: "Chargement remorque réfrigérée",
      at: "2026-05-16T18:00:00+02:00",
      location: "Damietta, EG",
      mode: "roro",
    },
    {
      code: "departure",
      label: "Départ RoRo",
      at: "2026-05-16T23:30:00+02:00",
      location: "Damietta, EG",
      mode: "roro",
    },
    {
      code: "transit",
      label: "Traversée Méditerranée",
      at: "2026-05-21T12:00:00+02:00",
      location: "Mer Ionienne",
      mode: "roro",
    },
    {
      code: "port_call",
      label: "Débarquement Trieste",
      at: "2026-05-25T06:00:00+02:00",
      location: "Trieste, IT",
      mode: "roro",
    },
    {
      code: "transit",
      label: "Camion (Wallenborn) vers UK",
      at: "2026-05-27T08:00:00+02:00",
      location: "Autoroute A4, IT/FR",
      mode: "road",
    },
    {
      code: "arrival",
      label: "Arrivée UK — lot dégradé",
      at: "2026-06-01T10:00:00+01:00",
      location: "Bognor Regis, UK",
      mode: "road",
    },
  ],
  position: {
    mode: "road",
    position: {
      lat: 45.6,
      lng: 13.8,
      at: "2026-05-25T06:00:00+02:00",
      label: "Trieste",
    },
    speedKn: null,
    headingDeg: 295,
    etaAt: "2026-06-01T10:00:00+01:00",
  },
};

const KNOWN_ROUTES: Record<string, Route> = {
  CAAU4027760: HELFER_MARSEILLE,
  OLMP2605160: BIMI_RORO_FATIGUE,
};

function fallbackRoute(ref: string): Route {
  const rnd = seededRandom(hashRef(ref));
  const airish = rnd() > 0.5;
  return airish
    ? {
        mode: "air",
        targetTempC: 4,
        timeline: [
          {
            code: "booking",
            label: "Booking fret aérien",
            at: "2026-05-14T06:00:00+02:00",
            location: "Le Caire (CAI), EG",
            mode: "air",
          },
          {
            code: "loading",
            label: "Palettisation",
            at: "2026-05-15T12:00:00+02:00",
            location: "Le Caire (CAI), EG",
            mode: "air",
          },
          {
            code: "departure",
            label: "Décollage",
            at: "2026-05-15T22:00:00+02:00",
            location: "Le Caire (CAI), EG",
            mode: "air",
          },
          {
            code: "arrival",
            label: "Atterrissage",
            at: "2026-05-16T02:30:00+02:00",
            location: "Amsterdam (AMS), NL",
            mode: "air",
          },
          {
            code: "delivery",
            label: "Livraison client",
            at: "2026-05-16T11:00:00+02:00",
            location: "Schiphol, NL",
            mode: "road",
          },
        ],
        position: {
          mode: "air",
          position: {
            lat: 48.1,
            lng: 11.6,
            at: "2026-05-15T23:30:00+02:00",
            label: "Au-dessus de Munich",
          },
          speedKn: 480,
          headingDeg: 320,
          etaAt: "2026-05-16T02:30:00+02:00",
        },
      }
    : HELFER_MARSEILLE;
}

function resolveRoute(ref: string): Route {
  return KNOWN_ROUTES[ref.toUpperCase()] ?? fallbackRoute(ref);
}

export class MockTrackingProvider implements TrackingProvider {
  readonly name = "mock-tracking";

  async getPosition(ref: string): Promise<VesselPosition | null> {
    if (!ref.trim()) return null;
    const route = resolveRoute(ref);
    return vesselPositionSchema.parse({ ref: ref.toUpperCase(), ...route.position });
  }

  async getTimeline(ref: string): Promise<TrackingEvent[]> {
    if (!ref.trim()) return [];
    const route = resolveRoute(ref);
    return route.timeline.map((e) => trackingEventSchema.parse(e));
  }
}

export class MockSensorProvider implements SensorProvider {
  readonly name = "mock-sensor";

  async getSeries(ref: string): Promise<SensorReading[]> {
    if (!ref.trim()) return [];
    const route = resolveRoute(ref);
    const rnd = seededRandom(hashRef(ref));
    const start = new Date(route.timeline[0]!.at).getTime();
    const end = new Date(route.timeline[route.timeline.length - 1]!.at).getTime();
    const points = 48; // ~échantillonnage régulier du voyage
    const step = (end - start) / points;

    const readings: SensorReading[] = [];
    for (let i = 0; i <= points; i++) {
      const t = start + step * i;
      const progress = i / points;
      // Excursion : pic de température au milieu du transit pour le lot "fatigué".
      const excursionBump =
        route.excursion && progress > 0.4 && progress < 0.7 ? 9 + rnd() * 4 : 0;
      const tempC = route.targetTempC + (rnd() - 0.5) * 0.8 + excursionBump;
      readings.push(
        sensorReadingSchema.parse({
          at: new Date(t).toISOString(),
          tempC: Number(tempC.toFixed(2)),
          humidityPct: Number((92 + (rnd() - 0.5) * 6).toFixed(1)),
          position: {
            lat: Number((31 + progress * 14 + (rnd() - 0.5)).toFixed(4)),
            lng: Number((31 - progress * 18 + (rnd() - 0.5)).toFixed(4)),
            at: new Date(t).toISOString(),
          },
        }),
      );
    }
    return readings;
  }
}

export class MockFieldTraceProvider implements FieldTraceProvider {
  readonly name = "mock-fieldtrace";

  async getTrace(ref: string): Promise<FieldTrace | null> {
    if (!ref.trim()) return null;
    return fieldTraceSchema.parse({
      ref: ref.toUpperCase(),
      site: "Al Batoul — New Cairo",
      parcelle: "P-07",
      variete: "Beauregard",
      dateRecolte: "2026-03-10",
      traitements: ["Aucun résidu > LMR", "Irrigation goutte-à-goutte"],
    });
  }
}

export class MockEmailProvider implements EmailProvider {
  readonly name = "mock-email";

  async listInbox(): Promise<EmailMessage[]> {
    const raw: EmailMessage[] = [
      {
        id: "eml-qc-986640",
        from: "quality@barfoots.com",
        to: ["valentin@natural-kiss.com"],
        subject: "QC report Tenderstem — RM 6kg (QA Flag RED)",
        receivedAt: "2026-03-19T11:20:00+00:00",
        snippet: "Please find attached the QC check. Flowering / hollow stems noted.",
        attachments: [
          {
            filename: "QCCheck_986640.pdf",
            contentType: "application/pdf",
            sizeBytes: 983741,
          },
        ],
      },
      {
        id: "eml-sweetpotato-qr",
        from: "qualite@georges-helfer.com",
        to: ["logistics@natural-kiss.com"],
        subject: "QR patate douce SHAHD EL MALIKA (CAAU4027760)",
        receivedAt: "2026-06-01T08:05:00+00:00",
        snippet: "Note qualité 7 — radicelles ~30% sur calibre L2.",
        attachments: [
          {
            filename: "BR41239_CAAU4027760_QR.pdf",
            contentType: "application/pdf",
            sizeBytes: 4867985,
          },
        ],
      },
    ];
    return raw.map((m) => emailMessageSchema.parse(m));
  }

  async send(input: {
    to: string[];
    subject: string;
    body: string;
  }): Promise<SendEmailResult> {
    return sendEmailResultSchema.parse({
      id: `mock-${hashRef(input.subject + input.to.join(","))}`,
      accepted: true,
      sentAt: new Date().toISOString(),
    });
  }
}

export class MockLlmProvider implements LlmProvider {
  readonly name = "mock-llm";

  async complete(prompt: string): Promise<LlmCompletion> {
    // Réponse déterministe : écho résumé, tokens dérivés de la longueur.
    const text = `【mock-llm】 ${prompt.slice(0, 240)}`;
    return llmCompletionSchema.parse({
      text,
      model: "mock-llm-deterministic",
      tokens: Math.ceil(prompt.length / 4),
    });
  }
}
