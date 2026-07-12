import { cn } from "@/lib/utils";
import type { FactureCoherence, PaiementStatut } from "@/lib/finance/rules";

const PAIEMENT_TONE: Record<PaiementStatut, string> = {
  paye: "text-primary bg-primary/10 border-primary/25",
  partiel: "text-harvest bg-harvest/10 border-harvest/30",
  en_attente: "text-harvest bg-harvest/10 border-harvest/30",
  a_venir: "text-muted-foreground bg-muted/40 border-border",
  litige: "text-destructive bg-destructive/10 border-destructive/25",
};

export function PaiementStatusBadge({
  statut,
  label,
  className,
}: {
  statut: PaiementStatut;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
        PAIEMENT_TONE[statut],
        className,
      )}
    >
      <span className="size-2 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

const COHERENCE_TONE: Record<FactureCoherence, string> = {
  coherente: "text-primary bg-primary/10 border-primary/25",
  incoherente: "text-destructive bg-destructive/10 border-destructive/25",
  inconnue: "text-muted-foreground bg-muted/40 border-border",
};

export function FactureCoherenceBadge({
  coherence,
  label,
  className,
}: {
  coherence: FactureCoherence;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
        COHERENCE_TONE[coherence],
        className,
      )}
    >
      <span className="size-2 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
