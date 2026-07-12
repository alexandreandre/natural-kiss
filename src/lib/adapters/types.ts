import { z } from "zod";

/**
 * Contrats d'adaptateurs — sources externes derrière une interface (§3.2 stratégie).
 *
 * Chaque source (MarineTraffic, FlightRadar, datalogger, Cropwise, email, LLM) a :
 *  - un schéma Zod qui valide **la sortie** de l'adaptateur (frontière),
 *  - une interface,
 *  - une implémentation `Mock` (par défaut) et, plus tard, une implémentation `Real`.
 *
 * Un simple flag choisit l'implémentation, sans réécrire les briques consommatrices.
 */

// ── Primitives ───────────────────────────────────────────────────────────────

export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  at: z.string().datetime({ offset: true }),
  label: z.string().optional(),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

// ── TrackingProvider (M7 — MarineTraffic / FlightRadar) ──────────────────────

export const transportModeSchema = z.enum(["sea", "roro", "air", "road"]);
export type TransportMode = z.infer<typeof transportModeSchema>;

export const trackingEventSchema = z.object({
  code: z.enum([
    "booking",
    "loading",
    "departure",
    "transit",
    "port_call",
    "arrival",
    "customs",
    "delivery",
  ]),
  label: z.string(),
  at: z.string().datetime({ offset: true }),
  location: z.string(),
  mode: transportModeSchema,
});
export type TrackingEvent = z.infer<typeof trackingEventSchema>;

export const vesselPositionSchema = z.object({
  ref: z.string(),
  mode: transportModeSchema,
  position: geoPointSchema,
  speedKn: z.number().nonnegative().nullable(),
  headingDeg: z.number().min(0).max(360).nullable(),
  etaAt: z.string().datetime({ offset: true }).nullable(),
});
export type VesselPosition = z.infer<typeof vesselPositionSchema>;

export interface TrackingProvider {
  readonly name: string;
  /** Position courante d'un lot/conteneur à partir de sa référence. */
  getPosition(ref: string): Promise<VesselPosition | null>;
  /** Timeline complète du voyage (booking → livraison). */
  getTimeline(ref: string): Promise<TrackingEvent[]>;
}

// ── SensorProvider (datalogger SIM / API capteurs) ───────────────────────────

export const sensorReadingSchema = z.object({
  at: z.string().datetime({ offset: true }),
  tempC: z.number(),
  humidityPct: z.number().min(0).max(100),
  position: geoPointSchema.nullable(),
});
export type SensorReading = z.infer<typeof sensorReadingSchema>;

export interface SensorProvider {
  readonly name: string;
  /** Série température/humidité/GPS (~1 point / 10 min) pour un lot. */
  getSeries(ref: string): Promise<SensorReading[]>;
}

// ── FieldTraceProvider (Cropwise — M0b) ──────────────────────────────────────

export const fieldTraceSchema = z.object({
  ref: z.string(),
  site: z.string(),
  parcelle: z.string(),
  variete: z.string(),
  dateRecolte: z.string(),
  traitements: z.array(z.string()),
});
export type FieldTrace = z.infer<typeof fieldTraceSchema>;

export interface FieldTraceProvider {
  readonly name: string;
  getTrace(ref: string): Promise<FieldTrace | null>;
}

// ── EmailProvider (boîte mail — T2) ──────────────────────────────────────────

export const emailAttachmentSchema = z.object({
  filename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});
export type EmailAttachment = z.infer<typeof emailAttachmentSchema>;

export const emailMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  subject: z.string(),
  receivedAt: z.string().datetime({ offset: true }),
  snippet: z.string(),
  attachments: z.array(emailAttachmentSchema),
});
export type EmailMessage = z.infer<typeof emailMessageSchema>;

export const sendEmailResultSchema = z.object({
  id: z.string(),
  accepted: z.boolean(),
  sentAt: z.string().datetime({ offset: true }),
});
export type SendEmailResult = z.infer<typeof sendEmailResultSchema>;

export interface EmailProvider {
  readonly name: string;
  listInbox(): Promise<EmailMessage[]>;
  send(input: {
    to: string[];
    subject: string;
    body: string;
  }): Promise<SendEmailResult>;
}

// ── LlmProvider (vérif doc / analyse PDF / copilot) ──────────────────────────

export const llmCompletionSchema = z.object({
  text: z.string(),
  model: z.string(),
  tokens: z.number().int().nonnegative(),
});
export type LlmCompletion = z.infer<typeof llmCompletionSchema>;

export interface LlmProvider {
  readonly name: string;
  complete(prompt: string): Promise<LlmCompletion>;
}

// ── DocVerifierProvider (M6 — vérificateur documentaire IA, Brique 3) ─────────

/** Types de document (aligné sur l'enum `document_type` de la base). */
export const documentTypeSchema = z.enum([
  "facture",
  "bl",
  "phyto",
  "packing_list",
  "certificat_origine",
  "ched_pp",
  "autre",
]);
export type DocumentTypeValue = z.infer<typeof documentTypeSchema>;

/**
 * Champs extraits d'un document (n° conteneur, poids, code HS, quantité,
 * déclaration additionnelle…). Souple par nature (extraction IA) : les clés
 * inconnues sont conservées.
 */
export const docMetadataSchema = z
  .object({
    numeroConteneur: z.string().nullish(),
    poidsBrutKg: z.number().nullish(),
    poidsNetKg: z.number().nullish(),
    codeHs: z.string().nullish(),
    quantite: z.number().nullish(),
    unite: z.string().nullish(),
    /** Organismes couverts par la Déclaration Additionnelle UE (phyto). */
    declarationAdditionnelle: z.array(z.string()).nullish(),
    /** Mention de conformité au règlement (UE) 2021/2285 (slips). */
    reglement20212285: z.boolean().nullish(),
  })
  .passthrough();
export type DocMetadata = z.infer<typeof docMetadataSchema>;

export const verifierDocSchema = z.object({
  id: z.string(),
  type: documentTypeSchema,
  nomFichier: z.string(),
  metadata: docMetadataSchema,
});
export type VerifierDoc = z.infer<typeof verifierDocSchema>;

export const anomalieSeveriteSchema = z.enum(["mineure", "majeure", "critique"]);
export type AnomalieSeverite = z.infer<typeof anomalieSeveriteSchema>;

/** Anomalie documentaire structurée — **schéma de sortie IA validé** (§ contraintes). */
export const docAnomalySchema = z.object({
  code: z.string(),
  champ: z.string().nullable(),
  severite: anomalieSeveriteSchema,
  message: z.string(),
  valeurs: z
    .object({
      attendu: z.string().nullish(),
      trouve: z.string().nullish(),
      /** Types de document en désaccord (facture, bl…). */
      sources: z.array(z.string()).optional(),
    })
    .default({}),
});
export type DocAnomaly = z.infer<typeof docAnomalySchema>;

export const docVerificationSchema = z.object({
  anomalies: z.array(docAnomalySchema),
  model: z.string(),
});
export type DocVerification = z.infer<typeof docVerificationSchema>;

export interface DocVerifierInput {
  ref: string;
  documents: VerifierDoc[];
}

export interface DocVerifierProvider {
  readonly name: string;
  /** Cohérence croisée entre documents → liste d'anomalies (validée par Zod). */
  verify(input: DocVerifierInput): Promise<DocVerification>;
}

// ── QcAnalyzerProvider (M9 — analyse IA des PDF de retour qualité, Brique 6) ──

/** Verdict qualité (aligné sur l'enum `qc_verdict` de la base). */
export const qcVerdictSchema = z.enum(["vert", "orange", "rouge"]);
export type QcVerdict = z.infer<typeof qcVerdictSchema>;

/** Sévérité d'un défaut relevé sur le retour qualité. */
export const qcSeveriteSchema = z.enum(["mineur", "majeur", "critique"]);
export type QcSeverite = z.infer<typeof qcSeveriteSchema>;

/** Familles de défauts, pour normaliser les tendances par produit. */
export const qcCategorieSchema = z.enum([
  "aspect",
  "maturite",
  "calibre",
  "parage",
  "sanitaire",
  "autre",
]);
export type QcCategorie = z.infer<typeof qcCategorieSchema>;

/** Un défaut extrait du PDF — **schéma de sortie IA validé** (§ contraintes). */
export const qcDefautSchema = z.object({
  code: z.string(),
  libelle: z.string(),
  categorie: qcCategorieSchema,
  severite: qcSeveriteSchema,
  /** Taux constaté (%) quand le rapport le chiffre (ex. Botrytis ~4 %). */
  tauxPct: z.number().min(0).max(100).nullish(),
});
export type QcDefaut = z.infer<typeof qcDefautSchema>;

/** Résultat structuré de l'analyse IA d'un PDF de retour qualité. */
export const qcAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: qcVerdictSchema,
  defauts: z.array(qcDefautSchema),
  resume: z.string(),
  model: z.string(),
});
export type QcAnalysis = z.infer<typeof qcAnalysisSchema>;

export interface QcAnalyzerInput {
  /** Nom du fichier PDF (sert de clé au mock déterministe). */
  filename: string;
  /** Produit du lot rattaché, pour contextualiser la taxonomie des défauts. */
  produit?: string | null;
  /** Référence du lot/conteneur (traçabilité). */
  ref?: string | null;
}

export interface QcAnalyzerProvider {
  readonly name: string;
  /** Analyse un PDF de retour → défauts + score + verdict (validés par Zod). */
  analyze(input: QcAnalyzerInput): Promise<QcAnalysis>;
}

// ── BookingConfirmationProvider (M4 — lecture IA d'un mail de confirmation, Brique 9) ──

/**
 * Extraction structurée d'une confirmation de booking reçue par mail (peu
 * importe le transporteur/broker) : n° conteneur, transporteur, date de
 * départ. Sert à **pré-remplir** le point d'entrée unique de confirmation —
 * l'utilisateur reste libre de corriger/compléter avant de valider.
 */
export const bookingConfirmationExtractSchema = z.object({
  numeroConteneur: z.string().nullable(),
  transporteurNom: z.string().nullable(),
  dateDepart: z.string().nullable(),
  mode: transportModeSchema.nullable(),
  model: z.string(),
});
export type BookingConfirmationExtract = z.infer<
  typeof bookingConfirmationExtractSchema
>;

export interface BookingConfirmationProvider {
  readonly name: string;
  /**
   * Lit un mail de confirmation de booking (texte brut, quel que soit
   * l'expéditeur — transporteur direct, broker, transitaire) et en extrait les
   * champs de la confirmation. Retour partiel toléré (champs `null`) : la
   * saisie manuelle complète toujours ce que l'IA n'a pas trouvé.
   */
  parseConfirmation(emailText: string): Promise<BookingConfirmationExtract>;
}
