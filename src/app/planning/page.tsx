import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { PlanningImport } from "@/components/planning/planning-import";
import { PlanningTable } from "@/components/planning/planning-table";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getPlanningView } from "@/lib/planning/service";

// Planning dépendant des données Supabase + import.
export const dynamic = "force-dynamic";

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border rounded-[4px] border px-3 py-2">
      <span className="text-muted-foreground/70 block font-mono text-[10px] tracking-[0.12em] uppercase">
        {label}
      </span>
      <span className="font-mono text-lg font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default async function PlanningPage() {
  if (!isFeatureEnabled("DASHBOARD")) notFound();

  const t = await getTranslations();
  const { lines, summary } = await getPlanningView();

  return (
    <div>
      <section>
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("planning.kicker")}
        </p>
        <h1 className="font-display mt-4 max-w-[24ch] text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-4xl">
          {t("planning.title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[62ch] text-sm leading-relaxed">
          {t("planning.subtitle")}
        </p>
      </section>

      <section className="mt-8">
        <PlanningImport />
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatChip label={t("planning.summary.total")} value={String(summary.total)} />
        <StatChip
          label={t("planning.summary.realise")}
          value={String(summary.realise)}
        />
        <StatChip
          label={t("planning.summary.glissement")}
          value={String(summary.glissement)}
        />
        <StatChip
          label={t("planning.summary.planifie")}
          value={String(summary.planifie)}
        />
        <StatChip
          label={t("planning.summary.realisation")}
          value={`${Math.round(summary.tauxRealisation * 100)} %`}
        />
      </section>

      <section className="mt-6">
        {lines.length === 0 ? (
          <div className="border-border text-muted-foreground rounded-[4px] border border-dashed p-10 text-center text-sm">
            {t("planning.empty")}
          </div>
        ) : (
          <PlanningTable lines={lines} />
        )}
      </section>
    </div>
  );
}
