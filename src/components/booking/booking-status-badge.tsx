import { cn } from "@/lib/utils";
import type { BookingStatut } from "@/lib/booking/service";

const TONE: Record<BookingStatut, string> = {
  brouillon: "text-muted-foreground bg-muted border-border",
  envoye: "text-harvest bg-harvest/10 border-harvest/30",
  confirme: "text-primary bg-primary/10 border-primary/25",
};

const DOT: Record<BookingStatut, string> = {
  brouillon: "bg-muted-foreground",
  envoye: "bg-harvest",
  confirme: "bg-primary",
};

export function BookingStatusBadge({
  statut,
  label,
  className,
}: {
  statut: BookingStatut;
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
