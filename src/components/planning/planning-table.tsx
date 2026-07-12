import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";
import type { PlanningEtat } from "@/lib/planning/kpi";
import type { PlanningLine } from "@/lib/planning/service";

const TH =
  "text-muted-foreground/80 pb-2.5 text-left font-mono text-[10px] font-medium tracking-[0.12em] uppercase";

const ETAT_CLASS: Record<PlanningEtat, string> = {
  realise: "bg-primary/10 text-primary",
  glissement: "bg-harvest/15 text-harvest",
  planifie: "bg-muted text-muted-foreground",
};

export async function PlanningTable({ lines }: { lines: PlanningLine[] }) {
  const t = await getTranslations();

  const fmtQty = (q: number | null, unite: string | null) => {
    if (q === null) return "—";
    const n = new Intl.NumberFormat("fr-FR").format(q);
    return unite ? `${n} ${unite}` : n;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-border border-b">
            <th className={TH}>{t("planning.table.week")}</th>
            <th className={cn(TH, "hidden md:table-cell")}>
              {t("planning.table.client")}
            </th>
            <th className={TH}>{t("planning.table.product")}</th>
            <th className={cn(TH, "hidden sm:table-cell")}>
              {t("planning.table.destination")}
            </th>
            <th className={cn(TH, "text-right")}>{t("planning.table.planned")}</th>
            <th className={cn(TH, "hidden lg:table-cell")}>
              {t("planning.table.actual")}
            </th>
            <th className={TH}>{t("planning.table.state")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr
              key={line.id}
              className="border-border/45 border-b transition-colors last:border-0"
            >
              <td className="py-3 pr-4 font-mono text-[13px] whitespace-nowrap tabular-nums">
                {line.semaineIso}
              </td>
              <td className="text-muted-foreground hidden py-3 pr-4 md:table-cell">
                {line.clientNom ?? "—"}
              </td>
              <td className="py-3 pr-4">
                {line.produit}
                {line.variete ? (
                  <span className="text-muted-foreground/70"> · {line.variete}</span>
                ) : null}
              </td>
              <td className="text-muted-foreground hidden py-3 pr-4 whitespace-nowrap sm:table-cell">
                {line.destinationPort ?? line.destinationPays ?? "—"}
              </td>
              <td className="py-3 pr-4 text-right font-mono text-[13px] whitespace-nowrap tabular-nums">
                {fmtQty(line.quantitePrevue, line.unite)}
              </td>
              <td className="text-muted-foreground hidden py-3 pr-4 lg:table-cell">
                {line.lotReference ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-mono text-[12px]">{line.lotReference}</span>
                    {line.lotStatut && (
                      <span className="text-muted-foreground/70 text-[11px]">
                        · {t(`lotStatus.${line.lotStatut}`)}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </td>
              <td className="py-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    ETAT_CLASS[line.etat],
                  )}
                >
                  {t(`planning.etat.${line.etat}`)}
                  {line.etat === "glissement" && line.ecartSemaines !== 0 && (
                    <span className="tabular-nums">
                      {line.ecartSemaines > 0 ? "+" : ""}
                      {line.ecartSemaines}
                      {t("planning.weekAbbr")}
                    </span>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
