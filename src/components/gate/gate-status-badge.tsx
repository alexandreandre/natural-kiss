import { cn } from "@/lib/utils";
import type { GateStatut } from "@/lib/gate/rules";

const TONE: Record<GateStatut, string> = {
  vert: "text-primary bg-primary/10 border-primary/25",
  rouge: "text-destructive bg-destructive/10 border-destructive/25",
  en_attente: "text-harvest bg-harvest/10 border-harvest/30",
};

const DOT: Record<GateStatut, string> = {
  vert: "bg-primary",
  rouge: "bg-destructive",
  en_attente: "bg-harvest",
};

export function GateStatusBadge({
  statut,
  label,
  className,
}: {
  statut: GateStatut;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
        TONE[statut],
        className,
      )}
    >
      <span className={cn("size-2 rounded-full", DOT[statut])} aria-hidden="true" />
      {label}
    </span>
  );
}
