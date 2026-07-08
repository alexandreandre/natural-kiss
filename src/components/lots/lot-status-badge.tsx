import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LotStatut } from "@/lib/data/lots";

const STYLES: Record<LotStatut, string> = {
  booking:
    "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  chargement:
    "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  transit:
    "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  arrive:
    "border-transparent bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  livre:
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  cloture:
    "border-transparent bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  rejete:
    "border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export function LotStatusBadge({ statut }: { statut: LotStatut }) {
  const t = useTranslations("lotStatus");
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[statut])}>
      {t(statut)}
    </Badge>
  );
}
