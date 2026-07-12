import { cn } from "@/lib/utils";
import type { AlerteSeverite } from "@/lib/alertes/rules";

const TONE: Record<AlerteSeverite, string> = {
  critique: "text-destructive bg-destructive/10 border-destructive/25",
  avertissement: "text-harvest bg-harvest/10 border-harvest/30",
  info: "text-muted-foreground bg-muted/40 border-border",
};

export function AlerteSeverityBadge({
  severite,
  label,
  className,
}: {
  severite: AlerteSeverite;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium",
        TONE[severite],
        className,
      )}
    >
      <span className="bg-current size-2 rounded-full" aria-hidden="true" />
      {label}
    </span>
  );
}
