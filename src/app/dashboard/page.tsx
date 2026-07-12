import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  getDashboardData,
  type DashboardFilters as Filters,
} from "@/lib/planning/service";
import type { RiskBand } from "@/lib/tracking/risk";

// Dashboard filtrable (searchParams) + données Supabase.
export const dynamic = "force-dynamic";

const RISK_BANDS: RiskBand[] = ["faible", "moyen", "eleve"];

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  return t ? t : undefined;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}`;
}

function KpiCard({
  label,
  value,
  unit,
  caption,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  tone?: "default" | "primary" | "harvest" | "destructive";
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary"
      : tone === "harvest"
        ? "text-harvest"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="border-border flex flex-col rounded-[4px] border p-4">
      <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.12em] uppercase">
        {label}
      </span>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={`font-mono text-3xl leading-none font-medium tabular-nums ${toneClass}`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-muted-foreground/70 font-mono text-[11px] tracking-[0.08em] uppercase">
            {unit}
          </span>
        )}
      </div>
      {caption && (
        <span className="text-muted-foreground/70 mt-2 text-[11px] leading-snug">
          {caption}
        </span>
      )}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isFeatureEnabled("DASHBOARD")) notFound();

  const t = await getTranslations();
  const params = await searchParams;

  const risqueRaw = first(params.risque);
  const filters: Filters = {
    clientId: first(params.client),
    produit: first(params.produit),
    pays: first(params.pays),
    risque:
      risqueRaw && RISK_BANDS.includes(risqueRaw as RiskBand)
        ? (risqueRaw as RiskBand)
        : undefined,
  };

  const data = await getDashboardData(filters);
  const { kpis } = data;

  return (
    <div>
      <section>
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("dashboard.kicker")}
        </p>
        <h1 className="font-display mt-4 max-w-[22ch] text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-4xl">
          {t("dashboard.title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[62ch] text-sm leading-relaxed">
          {t("dashboard.subtitle")}
        </p>
      </section>

      <section className="mt-8">
        <DashboardFilters options={data.options} />
      </section>

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={t("dashboard.kpi.service")}
          value={pct(kpis.tauxService)}
          unit="%"
          tone="primary"
          caption={t("dashboard.kpi.serviceCaption", { count: kpis.evalues })}
        />
        <KpiCard
          label={t("dashboard.kpi.late")}
          value={pct(kpis.tauxRetard)}
          unit="%"
          tone={kpis.tauxRetard > 0 ? "destructive" : "default"}
          caption={t("dashboard.kpi.lateCaption", { count: kpis.enRetard })}
        />
        <KpiCard
          label={t("dashboard.kpi.avgDelay")}
          value={kpis.retardMoyenJours.toFixed(1)}
          unit={t("tracking.risk.dayUnit")}
          tone={kpis.retardMoyenJours > 0 ? "harvest" : "default"}
          caption={t("dashboard.kpi.avgDelayCaption")}
        />
        <KpiCard
          label={t("dashboard.kpi.lots")}
          value={String(data.total)}
          caption={t("dashboard.kpi.lotsCaption", { transit: data.enTransit })}
        />
      </section>

      <section className="mt-6">
        {data.total === 0 ? (
          <div className="border-border text-muted-foreground rounded-[4px] border border-dashed p-10 text-center text-sm">
            {t("dashboard.empty")}
          </div>
        ) : (
          <DashboardCharts
            byStatut={data.byStatut}
            byPays={data.byPays}
            byRisque={data.byRisque}
          />
        )}
      </section>
    </div>
  );
}
