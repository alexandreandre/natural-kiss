import { Plane, Ship, Truck } from "lucide-react";

import type { TransportMode } from "@/lib/adapters/types";

/** Icône du mode de transport (mer/RoRo → navire, aérien → avion, route → camion). */
export function ModeIcon({
  mode,
  className,
}: {
  mode: TransportMode;
  className?: string;
}) {
  if (mode === "air") return <Plane className={className} />;
  if (mode === "road") return <Truck className={className} />;
  return <Ship className={className} />;
}
