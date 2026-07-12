import {
  type BookingConfirmationExtract,
  type BookingConfirmationProvider,
  type DocAnomaly,
  type DocVerification,
  type DocVerifierInput,
  type DocVerifierProvider,
  type EmailMessage,
  type EmailProvider,
  type FieldTrace,
  type FieldTraceProvider,
  type LlmCompletion,
  type LlmProvider,
  type QcAnalysis,
  type QcAnalyzerInput,
  type QcAnalyzerProvider,
  type QcDefaut,
  type QcVerdict,
  type SendEmailResult,
  type SensorProvider,
  type SensorReading,
  type TrackingEvent,
  type TrackingProvider,
  type TransportMode,
  type VerifierDoc,
  type VesselPosition,
  bookingConfirmationExtractSchema,
  docAnomalySchema,
  docVerificationSchema,
  emailMessageSchema,
  fieldTraceSchema,
  llmCompletionSchema,
  qcAnalysisSchema,
  sendEmailResultSchema,
  sensorReadingSchema,
  trackingEventSchema,
  verifierDocSchema,
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

/** Traces champ connues (Cropwise) — calquées sur le seed, pour un re-sync stable. */
const KNOWN_FIELD_TRACES: Record<string, Omit<FieldTrace, "ref">> = {
  CAAU4027760: {
    site: "Al Batoul — New Cairo",
    parcelle: "P-07",
    variete: "Beauregard",
    dateRecolte: "2026-03-08",
    traitements: ["Irrigation goutte-à-goutte"],
  },
  OLMP2605160: {
    site: "Al Batoul — New Cairo",
    parcelle: "P-02",
    variete: "Inspiration",
    dateRecolte: "2026-05-04",
    traitements: ["Culture âgée à la récolte"],
  },
  TCLU4239771: {
    site: "Al Batoul — New Cairo",
    parcelle: "P-03",
    variete: "Inspiration",
    dateRecolte: "2026-03-28",
    traitements: [],
  },
  OTPU6220580: {
    site: "Al Batoul — New Cairo",
    parcelle: "P-11",
    variete: "Bellevue",
    dateRecolte: "2026-05-10",
    traitements: ["Plants certifiés indemnes Thrips palmi"],
  },
  MEDU7781204: {
    site: "El Saada — Ismailia",
    parcelle: "ES-04",
    variete: "—",
    dateRecolte: "2026-06-25",
    traitements: [],
  },
};

/** Second site (multi-sites, Brique 8) utilisé pour les refs inconnues (fallback). */
const SITES = ["Al Batoul — New Cairo", "El Saada — Ismailia"] as const;

export class MockFieldTraceProvider implements FieldTraceProvider {
  readonly name = "mock-fieldtrace";

  async getTrace(ref: string): Promise<FieldTrace | null> {
    if (!ref.trim()) return null;
    const upper = ref.trim().toUpperCase();
    const known = KNOWN_FIELD_TRACES[upper];
    if (known) {
      return fieldTraceSchema.parse({ ref: upper, ...known });
    }

    // Fallback déterministe (ref inconnue) : site tiré du hash de la ref.
    const rnd = seededRandom(hashRef(upper));
    const site = SITES[Math.floor(rnd() * SITES.length)]!;
    return fieldTraceSchema.parse({
      ref: upper,
      site,
      parcelle: `P-${(hashRef(upper) % 20) + 1}`,
      variete: "—",
      dateRecolte: "2026-05-01",
      traitements: [],
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
        subject: "QC report Tenderstem — RM 6kg (QA Flag RED) — ref OLMP2605160",
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
      // Fil Voltz (slips patate douce, ref OTPU6220580 / LOT-2026-0004) — 3 messages,
      // pour démontrer le résumé de fil du copilot (T4) : instruction sheet, quarantaine,
      // puis litige financier (documents retenus).
      {
        id: "eml-voltz-01-instruction",
        from: "typhanie@graines-voltz.com",
        to: ["valentin@natural-kiss.com"],
        subject: "VOL AVION DU VENDREDI 15 MAI — QUANTITES / INSTRUCTION SHEET — Voltz (OTPU6220580)",
        receivedAt: "2026-05-13T09:10:00+02:00",
        snippet:
          "Merci de confirmer les quantités et l'instruction sheet pour le vol de vendredi (slips Bellevue, réf. OTPU6220580).",
        attachments: [],
      },
      {
        id: "eml-voltz-02-quarantaine",
        from: "virginie.jouin@graines-voltz.com",
        to: ["valentin@natural-kiss.com", "ayman@natural-kiss.com"],
        subject: "RE: VOL AVION DU VENDREDI 15 MAI — QUANTITES / INSTRUCTION SHEET — Voltz (OTPU6220580)",
        receivedAt: "2026-05-29T14:35:00+02:00",
        snippet:
          "Détention douanière Amsterdam : thrips / Bemisia détectés, Déclaration Additionnelle absente du phyto OTPU6220580.",
        attachments: [],
      },
      {
        id: "eml-voltz-03-litige",
        from: "virginie.jouin@graines-voltz.com",
        to: ["ayman@natural-kiss.com"],
        subject: "RE: VOL AVION DU VENDREDI 15 MAI — QUANTITES / INSTRUCTION SHEET — Voltz (OTPU6220580)",
        receivedAt: "2026-06-01T16:50:00+02:00",
        snippet:
          "Suite à la quarantaine, Voltz conteste la facture et retient les documents de paiement du lot OTPU6220580.",
        attachments: [],
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

// ── Vérificateur documentaire (cohérence croisée, pur & déterministe) ─────────

interface StringRule {
  code: string;
  severite: DocAnomaly["severite"];
  label: string;
}
interface NumberRule extends StringRule {
  /** Écart relatif toléré (0.01 = 1 %) avant de compter une incohérence. */
  tolerance: number;
}

type MetaKey = keyof VerifierDoc["metadata"];

function collectValues<T>(
  docs: VerifierDoc[],
  field: MetaKey,
): { value: T; source: string }[] {
  const out: { value: T; source: string }[] = [];
  for (const d of docs) {
    const value = d.metadata[field];
    if (value === null || value === undefined || value === "") continue;
    out.push({ value: value as T, source: d.type });
  }
  return out;
}

function checkStringField(
  docs: VerifierDoc[],
  field: MetaKey,
  rule: StringRule,
): DocAnomaly[] {
  const found = collectValues<string>(docs, field);
  const distinct = [...new Set(found.map((f) => String(f.value)))];
  if (distinct.length <= 1) return [];
  return [
    docAnomalySchema.parse({
      code: rule.code,
      champ: field,
      severite: rule.severite,
      message: `${rule.label} : ${found.map((f) => `${f.source} = ${f.value}`).join(" vs ")}.`,
      valeurs: {
        trouve: distinct.join(" / "),
        sources: [...new Set(found.map((f) => f.source))],
      },
    }),
  ];
}

function checkNumberField(
  docs: VerifierDoc[],
  field: MetaKey,
  rule: NumberRule,
): DocAnomaly[] {
  const found = collectValues<number>(docs, field);
  if (found.length < 2) return [];
  const values = found.map((f) => f.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === 0 || (max - min) / Math.abs(max) <= rule.tolerance) return [];
  return [
    docAnomalySchema.parse({
      code: rule.code,
      champ: field,
      severite: rule.severite,
      message: `${rule.label} : ${found.map((f) => `${f.source} = ${f.value}`).join(" vs ")}.`,
      valeurs: {
        trouve: `${min} … ${max}`,
        sources: [...new Set(found.map((f) => f.source))],
      },
    }),
  ];
}

/**
 * Vérification de **cohérence croisée** entre documents d'un même lot — logique
 * pure et déterministe (testable). Compare les champs partagés (n° conteneur,
 * code HS, poids, quantité) et renvoie une anomalie par divergence.
 *
 * C'est le cœur "IA" du vérificateur en mode mock : le vrai LLM produira le même
 * schéma d'anomalies (validé par Zod), sans changer la logique de la Gate.
 */
export function crossCheckDocuments(documents: VerifierDoc[]): DocAnomaly[] {
  const docs = documents.map((d) => verifierDocSchema.parse(d));
  return [
    ...checkStringField(docs, "numeroConteneur", {
      code: "conteneur_incoherent",
      severite: "critique",
      label: "N° de conteneur incohérent entre documents",
    }),
    ...checkStringField(docs, "codeHs", {
      code: "hs_incoherent",
      severite: "majeure",
      label: "Code HS incohérent entre documents",
    }),
    ...checkNumberField(docs, "poidsBrutKg", {
      code: "poids_incoherent",
      severite: "majeure",
      label: "Poids brut incohérent entre documents",
      tolerance: 0.01,
    }),
    ...checkNumberField(docs, "quantite", {
      code: "quantite_incoherente",
      severite: "majeure",
      label: "Quantité incohérente entre documents",
      tolerance: 0.01,
    }),
  ];
}

export class MockDocVerifierProvider implements DocVerifierProvider {
  readonly name = "mock-doc-verifier";

  async verify(input: DocVerifierInput): Promise<DocVerification> {
    const anomalies = crossCheckDocuments(input.documents);
    return docVerificationSchema.parse({
      anomalies,
      model: "mock-doc-verifier-deterministic",
    });
  }
}

// ── Analyse IA des PDF de retour qualité (M9, Brique 6) ───────────────────────

/**
 * Résultat d'analyse pré-calculé pour un PDF de retour qualité connu. Reproduit
 * les vrais rapports QC du workspace (base de connaissance §6) : c'est le mock
 * **déterministe** de l'extraction IA. Le vrai LLM produira le même schéma
 * (`qcAnalysisSchema`), sans changer la logique consommatrice (service/tendances).
 */
interface QcFixture {
  /** Sous-chaînes (majuscules) reconnaissant le fichier. */
  match: string[];
  score: number;
  verdict: QcVerdict;
  resume: string;
  defauts: QcDefaut[];
}

const QC_FIXTURES: QcFixture[] = [
  {
    match: ["986640"],
    score: 84,
    verdict: "rouge",
    resume:
      "Tenderstem RM 6 kg âgé (~12 j) : floraison marquée et tiges creuses. QA Flag ROUGE.",
    defauts: [
      {
        code: "floraison",
        libelle: "Floraison",
        categorie: "aspect",
        severite: "majeur",
      },
      {
        code: "florets-ouverts",
        libelle: "Florets ouverts",
        categorie: "aspect",
        severite: "majeur",
      },
      {
        code: "tiges-creuses",
        libelle: "Tiges creuses",
        categorie: "aspect",
        severite: "majeur",
      },
      {
        code: "parage",
        libelle: "Mauvais parage",
        categorie: "parage",
        severite: "mineur",
      },
      {
        code: "sur-diametre",
        libelle: "Sur-diamètre / sur-longueur",
        categorie: "calibre",
        severite: "mineur",
      },
    ],
  },
  {
    match: ["995769"],
    score: 91,
    verdict: "vert",
    resume:
      "Tenderstem RM 6 kg majoritairement conforme (2 checks rouges sur floraison/parage).",
    defauts: [
      {
        code: "floraison",
        libelle: "Floraison",
        categorie: "aspect",
        severite: "mineur",
      },
      { code: "parage", libelle: "Parage", categorie: "parage", severite: "mineur" },
      {
        code: "sur-longueur",
        libelle: "Sur-longueur",
        categorie: "calibre",
        severite: "mineur",
      },
      {
        code: "tiges-creuses",
        libelle: "Tiges creuses",
        categorie: "aspect",
        severite: "mineur",
      },
    ],
  },
  {
    match: ["CAAU4027760", "BR41239", "SWEET_POTATO", "SHAHD"],
    score: 70,
    verdict: "orange",
    resume:
      "Patate douce SHAHD EL MALIKA — note « Fair » : radicelles ~30 % (non-conforme L2), re-calibrage.",
    defauts: [
      {
        code: "radicelles",
        libelle: "Radicelles",
        categorie: "aspect",
        severite: "majeur",
        tauxPct: 30,
      },
      {
        code: "cicatrices",
        libelle: "Cicatrices",
        categorie: "aspect",
        severite: "mineur",
      },
      {
        code: "germination-precoce",
        libelle: "Germination précoce",
        categorie: "maturite",
        severite: "mineur",
      },
      {
        code: "sous-calibres",
        libelle: "Sous-calibres",
        categorie: "calibre",
        severite: "mineur",
      },
    ],
  },
  {
    match: ["FRAISE", "FA_FRAISE", "65673601", "65726201"],
    score: 55,
    verdict: "rouge",
    resume:
      "Fraise ELSAADA — code tri élevé (4) : Botrytis et fruits immatures au-dessus des seuils.",
    defauts: [
      {
        code: "botrytis",
        libelle: "Botrytis",
        categorie: "sanitaire",
        severite: "critique",
        tauxPct: 4.5,
      },
      {
        code: "fruits-immatures",
        libelle: "Fruits immatures",
        categorie: "maturite",
        severite: "majeur",
        tauxPct: 7.5,
      },
      {
        code: "fruits-mous",
        libelle: "Fruits mous / marqués",
        categorie: "aspect",
        severite: "mineur",
      },
      {
        code: "collets-blancs",
        libelle: "Collets blancs",
        categorie: "aspect",
        severite: "mineur",
      },
    ],
  },
];

function resolveQcFixture(filename: string): QcFixture | null {
  const up = filename.toUpperCase();
  return QC_FIXTURES.find((f) => f.match.some((m) => up.includes(m))) ?? null;
}

export class MockQcAnalyzerProvider implements QcAnalyzerProvider {
  readonly name = "mock-qc-analyzer";

  async analyze(input: QcAnalyzerInput): Promise<QcAnalysis> {
    const fixture = resolveQcFixture(input.filename);
    const model = "mock-qc-analyzer-deterministic";

    if (fixture) {
      return qcAnalysisSchema.parse({
        score: fixture.score,
        verdict: fixture.verdict,
        defauts: fixture.defauts,
        resume: fixture.resume,
        model,
      });
    }

    // PDF inconnu : analyse « propre » par défaut, déterministe (sans défaut).
    return qcAnalysisSchema.parse({
      score: 88,
      verdict: "vert",
      defauts: [],
      resume: input.produit
        ? `Retour ${input.produit} conforme — aucun défaut significatif détecté.`
        : "Retour conforme — aucun défaut significatif détecté.",
      model,
    });
  }
}

// ── Lecture IA d'un mail de confirmation de booking (M4, Brique 9) ────────────

const CONTAINER_RE = /\b([A-Z]{4}\d{6,7})\b/;
const DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b/;
/** Repères transporteurs connus (base de connaissance) → mode déduit. */
const CARRIER_HINTS: { match: RegExp; nom: string; mode: TransportMode }[] = [
  { match: /dfds|olympos/i, nom: "DFDS (RoRo Olympos Seaways)", mode: "roro" },
  { match: /msc|borchard/i, nom: "MSC / Borchard", mode: "sea" },
  { match: /total cargo|\btcl\b/i, nom: "Total Cargo Shipping (TCL)", mode: "sea" },
  { match: /kuehne|k\s*\+\s*n/i, nom: "Kuehne + Nagel", mode: "air" },
  { match: /wallenborn/i, nom: "Wallenborn", mode: "road" },
  { match: /air france/i, nom: "Air France Cargo", mode: "air" },
];

/**
 * Extraction déterministe (regex + repères transporteurs connus) du mail de
 * confirmation de booking — peu importe l'expéditeur (transporteur direct,
 * broker, transitaire). Le vrai LLM produira le même schéma
 * (`bookingConfirmationExtractSchema`), sans changer le formulaire de
 * confirmation qui consomme ce résultat comme simple pré-remplissage.
 */
export class MockBookingConfirmationProvider implements BookingConfirmationProvider {
  readonly name = "mock-booking-confirmation";

  async parseConfirmation(emailText: string): Promise<BookingConfirmationExtract> {
    const numeroConteneur = emailText.match(CONTAINER_RE)?.[1] ?? null;
    const dateDepart = emailText.match(DATE_RE)?.[1] ?? null;
    const carrier = CARRIER_HINTS.find((c) => c.match.test(emailText));

    return bookingConfirmationExtractSchema.parse({
      numeroConteneur,
      transporteurNom: carrier?.nom ?? null,
      dateDepart,
      mode: carrier?.mode ?? null,
      model: "mock-booking-confirmation-deterministic",
    });
  }
}
