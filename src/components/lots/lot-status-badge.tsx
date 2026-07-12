import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { LotStatut } from "@/lib/data/lots";

/** Point coloré + libellé — pastille discrète « registre », pas de pilule bonbon. */
const DOT: Record<LotStatut, string> = {
  booking: "bg-muted-foreground/45",
  chargement: "bg-sky-600 dark:bg-sky-400",
  transit: "bg-harvest",
  arrive: "bg-primary/70",
  livre: "bg-primary",
  cloture: "bg-muted-foreground/40",
  rejete: "bg-destructive",
};

export function LotStatusBadge({ statut }: { statut: LotStatut }) {
  const t = useTranslations("lotStatus");
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-medium whitespace-nowrap">
      <span className={cn("size-1.5 rounded-full", DOT[statut])} aria-hidden="true" />
      {t(statut)}
    </span>
  );
}
