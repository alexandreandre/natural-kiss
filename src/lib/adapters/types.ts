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
