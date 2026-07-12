import { getTranslations } from "next-intl/server";

import type { QualiteTrends, TrendGroup } from "@/lib/qualite/rules";
import { cn } from "@/lib/utils";

/** Barre empilée vert / orange / rouge des verdicts d'un groupe. */
function VerdictBar({ group }: { group: TrendGroup }) {
  const total = group.total || 1;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="bg-muted flex h-1.5 w-full overflow-hidden rounded-full">
      <span className="bg-primary" style={{ width: seg(group.vert) }} />
      <span className="bg-harvest" style={{ width: seg(group.orange) }} />
      <span className="bg-destructive" style={{ width: seg(group.rouge) }} />
    </div>
  );
}

async function TrendColumn({
  titleKey,
  groups,
}: {
  titleKey: string;
  groups: TrendGroup[];
}) {
  const t = await getTranslations("qualite.trends");

  return (
    <div className="border-border rounded-[4px] border p-4">
      <h3 className="text-muted-foreground/70 mb-3 font-mono text-[10px] tracking-[0.14em] uppercase">
        {t(titleKey)}
      </h3>
      {groups.length === 0 ? (
        <p className="text-muted-foreground/60 text-xs">{t("emptyGroup")}</p>
      ) : (
        <ul className="space-y-3.5">
          {groups.map((g) => (
            <li key={g.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{g.key}</span>
                <span className="text-muted-foreground/70 shrink-0 font-mono text-[11px] tabular-nums">
                  {g.scoreMoyen !== null ? g.scoreMoyen : "—"}
                  <span className="text-muted-foreground/40"> · {g.total}</span>
                </span>
              </div>
              <VerdictBar group={g} />
              {g.topDefauts.length > 0 && (
                <p className="text-muted-foreground/70 truncate text-[11px]">
                  {g.topDefauts.map((d) => `${d.libelle} (${d.count})`).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export async function QualiteTrendsView({ trends }: { trends: QualiteTrends }) {
  const t = await getTranslations("qualite.trends");

  if (trends.total === 0) {
    return (
      <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-8 text-center text-sm">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top défauts, toutes analyses confondues. */}
      {trends.topDefauts.length > 0 && (
        <div className="border-border rounded-[4px] border p-4">
          <h3 className="text-muted-foreground/70 mb-3 font-mono text-[10px] tracking-[0.14em] uppercase">
            {t("topDefauts")}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {trends.topDefauts.map((d) => (
              <span
                key={d.code}
                className="border-border bg-muted/40 inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 text-xs"
              >
                {d.libelle}
                <span
                  className={cn(
                    "bg-muted-foreground/15 rounded-full px-1.5 font-mono text-[10px] tabular-nums",
                  )}
                >
                  {d.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <TrendColumn titleKey="byProduit" groups={trends.byProduit} />
        <TrendColumn titleKey="byClient" groups={trends.byClient} />
        <TrendColumn titleKey="bySite" groups={trends.bySite} />
      </div>
    </div>
  );
}
