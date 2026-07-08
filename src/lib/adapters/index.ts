import type {
  EmailProvider,
  FieldTraceProvider,
  LlmProvider,
  SensorProvider,
  TrackingProvider,
} from "@/lib/adapters/types";
import {
  MockEmailProvider,
  MockFieldTraceProvider,
  MockLlmProvider,
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
