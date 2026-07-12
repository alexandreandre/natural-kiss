import { getTranslations } from "next-intl/server";

import { MapView, type MapPointInput } from "@/components/tracking/map-view";
import { RiskGauge } from "@/components/tracking/risk-gauge";
import { SensorChart } from "@/components/tracking/sensor-chart";
import { TrackingTimeline } from "@/components/tracking/tracking-timeline";
import type { TrackingResult } from "@/lib/tracking/service";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-muted-foreground/80 mb-3 font-mono text-[10px] tracking-[0.14em] uppercase">
      {children}
    </h2>
  );
}

/**
 * Bloc « voyage » d'un lot : carte + frise + score de risque + courbe capteur.
 * Réutilisé tel quel par la page de suivi (Brique 1) et par l'onglet Voyage de
 * la fiche lot 360° (Brique 2), pour garantir une vue de voyage cohérente.
 */
export async function TrackingVoyage({ result }: { result: TrackingResult }) {
  const t = await getTranslations("tracking");

  const track: MapPointInput[] = result.readings
    .filter((r) => r.position)
    .map((r) => ({ lat: r.position!.lat, lng: r.position!.lng }));
  const current: MapPointInput | null = result.position
    ? {
        lat: result.position.position.lat,
        lng: result.position.position.lng,
        label: result.position.position.label,
      }
    : null;

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section>
            <SectionTitle>{t("map.title")}</SectionTitle>
            <MapView track={track} current={current} />
          </section>

          <section>
            <SectionTitle>{t("timeline.title")}</SectionTitle>
            <TrackingTimeline
              events={result.events}
              currentIndex={result.currentEventIndex}
            />
          </section>
        </div>

        <aside>
          <RiskGauge risk={result.risk} />
        </aside>
      </div>

      <section>
        <SectionTitle>{t("sensor.title")}</SectionTitle>
        <SensorChart
          readings={result.readings.map((r) => ({
            at: r.at,
            tempC: r.tempC,
            humidityPct: r.humidityPct,
          }))}
          targetTempC={result.lot.temperatureConsigneC}
        />
      </section>
    </div>
  );
}
