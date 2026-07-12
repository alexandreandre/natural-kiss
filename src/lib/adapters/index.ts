import type {
  BookingConfirmationProvider,
  DocVerifierProvider,
  EmailProvider,
  FieldTraceProvider,
  LlmProvider,
  QcAnalyzerProvider,
  SensorProvider,
  TrackingProvider,
} from "@/lib/adapters/types";
import {
  MockBookingConfirmationProvider,
  MockDocVerifierProvider,
  MockEmailProvider,
  MockFieldTraceProvider,
  MockLlmProvider,
  MockQcAnalyzerProvider,
  MockSensorProvider,
  MockTrackingProvider,
} from "@/lib/adapters/mock";

export * from "@/lib/adapters/types";

/**
 * Fabrique d'adaptateurs. Chaque source bascule *indépendamment* mock → réel
 * via une variable d'environnement (`NK_<SOURCE>_PROVIDER`), sans toucher aux
 * briques consommatrices. En Brique 0, seul `mock` est implémenté.
 */

type Impl = "mock" | "real";

function pick(envKey: string): Impl {
  return process.env[envKey] === "real" ? "real" : "mock";
}

function notImplemented(source: string): never {
  throw new Error(
    `Adaptateur réel "${source}" non implémenté (mock-first). ` +
      `Retirez ${source}=real ou branchez l'implémentation réelle.`,
  );
}

export function getTrackingProvider(): TrackingProvider {
  return pick("NK_TRACKING_PROVIDER") === "real"
    ? notImplemented("NK_TRACKING_PROVIDER")
    : new MockTrackingProvider();
}

export function getSensorProvider(): SensorProvider {
  return pick("NK_SENSOR_PROVIDER") === "real"
    ? notImplemented("NK_SENSOR_PROVIDER")
    : new MockSensorProvider();
}

export function getFieldTraceProvider(): FieldTraceProvider {
  return pick("NK_FIELDTRACE_PROVIDER") === "real"
    ? notImplemented("NK_FIELDTRACE_PROVIDER")
    : new MockFieldTraceProvider();
}

export function getEmailProvider(): EmailProvider {
  return pick("NK_EMAIL_PROVIDER") === "real"
    ? notImplemented("NK_EMAIL_PROVIDER")
    : new MockEmailProvider();
}

export function getLlmProvider(): LlmProvider {
  return pick("NK_LLM_PROVIDER") === "real"
    ? notImplemented("NK_LLM_PROVIDER")
    : new MockLlmProvider();
}

/**
 * Vérificateur documentaire (Brique 3). Adossé au LLM : bascule mock → réel via
 * `NK_LLM_PROVIDER=real`. Le mock est déterministe (cohérence croisée pure) ;
 * le réel produira le même schéma d'anomalies validé par Zod.
 */
export function getDocVerifierProvider(): DocVerifierProvider {
  return pick("NK_LLM_PROVIDER") === "real"
    ? notImplemented("NK_LLM_PROVIDER")
    : new MockDocVerifierProvider();
}

/**
 * Analyseur IA des PDF de retour qualité (Brique 6). Adossé au LLM : bascule
 * mock → réel via `NK_LLM_PROVIDER=real`. Le mock est déterministe (fixtures
 * calquées sur les vrais rapports QC) ; le réel produira le même schéma
 * (`qcAnalysisSchema`) validé par Zod.
 */
export function getQcAnalyzerProvider(): QcAnalyzerProvider {
  return pick("NK_LLM_PROVIDER") === "real"
    ? notImplemented("NK_LLM_PROVIDER")
    : new MockQcAnalyzerProvider();
}

/**
 * Lecture IA d'un mail de confirmation de booking (M4, Brique 9). Adossé au
 * LLM : bascule mock → réel via `NK_LLM_PROVIDER=real`. Le mock est
 * déterministe (regex + repères transporteurs) ; le réel produira le même
 * schéma (`bookingConfirmationExtractSchema`) validé par Zod — simple
 * pré-remplissage du formulaire de confirmation, jamais une contrainte.
 */
export function getBookingConfirmationProvider(): BookingConfirmationProvider {
  return pick("NK_LLM_PROVIDER") === "real"
    ? notImplemented("NK_LLM_PROVIDER")
    : new MockBookingConfirmationProvider();
}
