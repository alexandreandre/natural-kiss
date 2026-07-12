"use client";

import { AlertTriangle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { LotStatusBadge } from "@/components/lots/lot-status-badge";
import { ModeIcon } from "@/components/tracking/mode-icon";
import { cn } from "@/lib/utils";
import type { LotListItem } from "@/lib/data/lots";

function RiskCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground/50">—</span>;
  const tone =
    score >= 70
      ? "text-destructive"
      : score >= 40
        ? "text-harvest"
        : "text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-1.5 font-mono text-[13px] font-medium tabular-nums",
        tone,
      )}
    >
      {score >= 70 && <AlertTriangle className="size-3.5" />}
      {String(score).padStart(2, "0")}
    </span>
  );
}

const TH =
  "text-muted-foreground/80 pb-2.5 text-left font-mono text-[10px] font-medium tracking-[0.12em] uppercase";

export function LotsTable({ lots }: { lots: LotListItem[] }) {
  const t = useTranslations();
  const format = useFormatter();
  const router = useRouter();

  const fmt = (iso: string | null) =>
    iso ? format.dateTime(new Date(iso), { day: "2-digit", month: "short" }) : "—";

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-border border-b">
            <th className={TH}>{t("lotTable.reference")}</th>
            <th className={cn(TH, "hidden md:table-cell")}>{t("lotTable.client")}</th>
            <th className={TH}>{t("lotTable.product")}</th>
            <th className={cn(TH, "hidden sm:table-cell")}>
              {t("lotTable.destination")}
            </th>
            <th className={cn(TH, "hidden lg:table-cell")}>{t("lotTable.mode")}</th>
            <th className={cn(TH, "hidden lg:table-cell")}>
              {t("lotTable.departure")}
            </th>
            <th className={TH}>{t("lotTable.status")}</th>
            <th className={cn(TH, "text-right")}>{t("lotTable.risk")}</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((lot) => (
            <tr
              key={lot.id}
              onClick={() => router.push(`/lots/${lot.id}`)}
              className="border-border/45 hover:bg-accent/60 focus-within:bg-accent/60 cursor-pointer border-b transition-colors last:border-0"
            >
              <td className="py-3.5 pr-4">
                <Link
                  href={`/lots/${lot.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  {lot.reference}
                </Link>
                <span className="text-muted-foreground/70 mt-0.5 block font-mono text-[11px]">
                  {lot.numeroConteneur ?? t("lots.noContainer")}
                </span>
              </td>
              <td className="text-muted-foreground hidden py-3.5 pr-4 md:table-cell">
                {lot.clientNom ?? "—"}
              </td>
              <td className="py-3.5 pr-4">
                {lot.produit}
                {lot.variete ? (
                  <span className="text-muted-foreground/70"> · {lot.variete}</span>
                ) : null}
              </td>
              <td className="text-muted-foreground hidden py-3.5 pr-4 whitespace-nowrap sm:table-cell">
                {lot.destinationPort ?? lot.destinationPays ?? "—"}
              </td>
              <td className="text-muted-foreground hidden py-3.5 pr-4 lg:table-cell">
                <span className="inline-flex items-center gap-1.5">
                  <ModeIcon mode={lot.mode} className="size-3.5" />
                  {t(`tracking.modes.${lot.mode}`)}
                </span>
              </td>
              <td className="text-muted-foreground hidden py-3.5 pr-4 font-mono text-xs whitespace-nowrap tabular-nums lg:table-cell">
                {fmt(lot.dateDepart)}
                <span className="text-muted-foreground/50"> → </span>
                {fmt(lot.dateArriveeReelle ?? lot.dateArriveePrevue)}
              </td>
              <td className="py-3.5 pr-4">
                <LotStatusBadge statut={lot.statut} />
              </td>
              <td className="py-3.5 text-right">
                <RiskCell score={lot.scoreRisque} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
