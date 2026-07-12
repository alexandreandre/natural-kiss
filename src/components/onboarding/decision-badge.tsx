import { cn } from "@/lib/utils";

type Decision = "suffisant" | "insuffisant" | "en_attente";

const TONE: Record<Decision, string> = {
  suffisant: "text-primary bg-primary/10 border-primary/25",
  insuffisant: "text-destructive bg-destructive/10 border-destructive/25",
  en_attente: "text-harvest bg-harvest/10 border-harvest/30",
};

const DOT: Record<Decision, string> = {
  suffisant: "bg-primary",
  insuffisant: "bg-destructive",
  en_attente: "bg-harvest",
};

export function DecisionBadge({
  decision,
  label,
  className,
}: {
  decision: Decision;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
        TONE[decision],
        className,
      )}
    >
      <span className={cn("size-2 rounded-full", DOT[decision])} aria-hidden="true" />
      {label}
    </span>
  );
}
