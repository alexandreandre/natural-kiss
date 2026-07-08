import { AlertTriangle, Ship } from "lucide-react";
import { useTranslations } from "next-intl";

import { LotStatusBadge } from "@/components/lots/lot-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { LotListItem } from "@/lib/data/lots";

function RiskCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">—</span>;
  const tone =
    score >= 70
      ? "text-red-600 dark:text-red-400"
      : score >= 40
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400";
  return (
    <span
      className={cn("inline-flex items-center gap-1 font-medium tabular-nums", tone)}
    >
      {score >= 70 && <AlertTriangle className="size-3.5" />}
      {score}
    </span>
  );
}

export function LotsPreview({ lots }: { lots: LotListItem[] }) {
  const t = useTranslations();

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>{t("lotTable.reference")}</TableHead>
            <TableHead>{t("lotTable.container")}</TableHead>
            <TableHead>{t("lotTable.client")}</TableHead>
            <TableHead>{t("lotTable.product")}</TableHead>
            <TableHead>{t("lotTable.destination")}</TableHead>
            <TableHead>{t("lotTable.status")}</TableHead>
            <TableHead className="text-right">{t("lotTable.risk")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lots.map((lot) => (
            <TableRow key={lot.id}>
              <TableCell className="font-medium">{lot.reference}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {lot.numeroConteneur ?? "—"}
              </TableCell>
              <TableCell>{lot.clientNom ?? "—"}</TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5">
                  <Ship className="text-muted-foreground size-3.5" />
                  {lot.produit}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {lot.destinationPort ?? lot.destinationPays ?? "—"}
              </TableCell>
              <TableCell>
                <LotStatusBadge statut={lot.statut} />
              </TableCell>
              <TableCell className="text-right">
                <RiskCell score={lot.scoreRisque} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
