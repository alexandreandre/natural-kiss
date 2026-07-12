import "server-only";

import { getSensorProvider, getTrackingProvider } from "@/lib/adapters";
import type {
  SensorReading,
  TrackingEvent,
  VesselPosition,
} from "@/lib/adapters/types";
import { getLotForTracking, type LotTracking } from "@/lib/data/lots";
import { computeArrivalRisk, type RiskResult } from "@/lib/tracking/risk";

export interface TrackingResult {
  lot: LotTracking;
  /** Référence utilisée côté adaptateurs (conteneur, sinon référence lot). */
  ref: string;
  events: TrackingEvent[];
  /** Index du dernier événement déjà survenu (-1 si aucun) — étape courante. */
  currentEventIndex: number;
  position: VesselPosition | null;
  readings: SensorReading[];
  risk: RiskResult;
}

/** Départ/arrivée déduits de la timeline (pour le calcul de risque). */
function boundsFromEvents(events: TrackingEvent[]): {
  departureAt: string | null;
  arrivalAt: string | null;
} {
  const departure = events.find((e) => e.code === "departure") ?? events[0];
  const arrival =
    [...events].reverse().find((e) => e.code === "arrival" || e.code === "delivery") ??
    events[events.length - 1];
  return {
    departureAt: departure?.at ?? null,
    arrivalAt: arrival?.at ?? null,
  };
}

/**
 * Résout tout le voyage d'un lot à partir d'un numéro : lot (Supabase),
 * timeline + position (TrackingProvider mock), série capteur (SensorProvider
 * mock), puis score de risque d'arrivée (logique pure). `null` si introuvable.
 */
export async function resolveTracking(query: string): Promise<TrackingResult | null> {
  const lot = await getLotForTracking(query);
  if (!lot) return null;

  const ref = lot.numeroConteneur ?? lot.reference;
  const tracking = getTrackingProvider();
  const sensor = getSensorProvider();

  const [events, position, readings] = await Promise.all([
    tracking.getTimeline(ref),
    tracking.getPosition(ref),
    sensor.getSeries(ref),
  ]);

  const nowMs = Date.now();
  const currentEventIndex = events.reduce(
    (acc, e, i) => (Date.parse(e.at) <= nowMs ? i : acc),
    -1,
  );

  const { departureAt, arrivalAt } = boundsFromEvents(events);
  const risk = computeArrivalRisk({
    mode: lot.mode,
    targetTempC: lot.temperatureConsigneC,
    harvestDate: lot.harvestDate,
    departureAt: lot.dateDepart ?? departureAt,
    arrivalAt: lot.dateArriveeReelle ?? lot.dateArriveePrevue ?? arrivalAt,
    readings: readings.map((r) => ({ at: r.at, tempC: r.tempC })),
  });

  return { lot, ref, events, currentEventIndex, position, readings, risk };
}
