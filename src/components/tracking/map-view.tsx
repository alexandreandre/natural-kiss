"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

export interface MapPointInput {
  lat: number;
  lng: number;
  label?: string;
}

export interface MapViewProps {
  /** Trace GPS ordonnée (points datalogger). */
  track: MapPointInput[];
  /** Position courante (mise en avant). */
  current: MapPointInput | null;
}

// Fond de carte MapLibre "demotiles" — vectoriel, open-source, sans clé API.
const STYLE_URL = "https://demotiles.maplibre.org/style.json";

function isWebGLAvailable(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    return gl !== null;
  } catch {
    return false;
  }
}

function formatCoord(value: number): string {
  return value.toFixed(4);
}

function MapFallback({
  current,
  message,
}: {
  current: MapPointInput | null;
  message: string;
}) {
  const t = useTranslations("tracking.map");

  return (
    <div
      data-testid="map-view"
      className="border-border bg-muted/30 text-muted-foreground flex h-[300px] w-full flex-col items-center justify-center gap-3 rounded-[4px] border px-6 text-center text-sm"
    >
      <p>{message}</p>
      {current ? (
        <>
          <p>
            {t("currentPosition", {
              lat: formatCoord(current.lat),
              lng: formatCoord(current.lng),
            })}
            {current.label ? ` — ${current.label}` : null}
          </p>
          <a
            href={`https://www.openstreetmap.org/?mlat=${current.lat}&mlon=${current.lng}#map=6/${current.lat}/${current.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {t("openInOsm")}
          </a>
        </>
      ) : null}
    </div>
  );
}

export function MapView({ track, current }: MapViewProps) {
  const t = useTranslations("tracking.map");
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const unavailableMessage = t("unavailable");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let map: import("maplibre-gl").Map | null = null;
    let cancelled = false;

    void (async () => {
      if (!isWebGLAvailable()) {
        if (!cancelled) setMapError(unavailableMessage);
        return;
      }

      setMapError(null);

      try {
        const maplibre = (await import("maplibre-gl")).default;
        if (cancelled || !el) return;

        const coords: [number, number][] = track.map((p) => [p.lng, p.lat]);
        const focus = current ?? track[track.length - 1] ?? track[0] ?? null;

        map = new maplibre.Map({
          container: el,
          style: STYLE_URL,
          center: focus ? [focus.lng, focus.lat] : [15, 40],
          zoom: focus ? 4 : 2,
          attributionControl: { compact: true },
        });
        map.addControl(
          new maplibre.NavigationControl({ showCompass: false }),
          "top-right",
        );

        map.on("load", () => {
          if (!map) return;

          if (coords.length >= 2) {
            map.addSource("route", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: coords },
              },
            });
            map.addLayer({
              id: "route-line",
              type: "line",
              source: "route",
              layout: { "line-cap": "round", "line-join": "round" },
              paint: {
                "line-color": "#c98a3a",
                "line-width": 2.5,
                "line-opacity": 0.9,
              },
            });

            const bounds = coords.reduce(
              (b, c) => b.extend(c),
              new maplibre.LngLatBounds(coords[0], coords[0]),
            );
            map.fitBounds(bounds, { padding: 48, maxZoom: 6, duration: 0 });
          }

          // Marqueurs départ / arrivée / position courante.
          if (track.length > 0) {
            new maplibre.Marker({ color: "#3f7a52" })
              .setLngLat([track[0]!.lng, track[0]!.lat])
              .addTo(map);
            const last = track[track.length - 1]!;
            new maplibre.Marker({ color: "#3f7a52" })
              .setLngLat([last.lng, last.lat])
              .addTo(map);
          }
          if (current) {
            const marker = new maplibre.Marker({ color: "#c98a3a" }).setLngLat([
              current.lng,
              current.lat,
            ]);
            if (current.label) {
              marker.setPopup(
                new maplibre.Popup({ offset: 24 }).setText(current.label),
              );
            }
            marker.addTo(map);
          }
        });
      } catch {
        if (!cancelled) {
          setMapError(unavailableMessage);
        }
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [track, current, unavailableMessage]);

  if (mapError) {
    return <MapFallback current={current} message={mapError} />;
  }

  return (
    <div
      ref={containerRef}
      data-testid="map-view"
      className="border-border h-[300px] w-full overflow-hidden rounded-[4px] border"
    />
  );
}
