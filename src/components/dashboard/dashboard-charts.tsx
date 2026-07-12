"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LotStatut } from "@/lib/data/lots";
import type { RiskBand } from "@/lib/tracking/risk";

export interface DashboardChartsProps {
  byStatut: { key: LotStatut; count: number }[];
  byPays: { key: string; count: number }[];
  byRisque: { key: RiskBand; count: number }[];
}

const RISK_COLOR: Record<RiskBand, string> = {
  faible: "var(--primary)",
  moyen: "var(--harvest)",
  eleve: "var(--destructive)",
};

interface BarDatum {
  label: string;
  count: number;
  color: string;
}

function HBarChart({ data, testId }: { data: BarDatum[]; testId: string }) {
  if (data.length === 0) return null;
  const height = Math.max(120, data.length * 34 + 16);
  return (
    <div style={{ height }} className="w-full" data-testid={testId}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
          barCategoryGap="22%"
        >
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
          />
          <YAxis
            type="category"
            dataKey="label"
            width={112}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
          />
          <Bar dataKey="count" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardCharts({ byStatut, byPays, byRisque }: DashboardChartsProps) {
  const t = useTranslations();

  const statutData: BarDatum[] = byStatut.map((s) => ({
    label: t(`lotStatus.${s.key}`),
    count: s.count,
    color: "var(--chart-1)",
  }));
  const paysData: BarDatum[] = byPays.map((p) => ({
    label: p.key,
    count: p.count,
    color: "var(--harvest)",
  }));
  const risqueData: BarDatum[] = byRisque
    .filter((r) => r.count > 0)
    .map((r) => ({
      label: t(`tracking.risk.band.${r.key}`),
      count: r.count,
      color: RISK_COLOR[r.key],
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard title={t("dashboard.charts.byStatut")}>
        <HBarChart data={statutData} testId="chart-statut" />
      </ChartCard>
      <ChartCard title={t("dashboard.charts.byCountry")}>
        <HBarChart data={paysData} testId="chart-pays" />
      </ChartCard>
      <ChartCard title={t("dashboard.charts.byRisk")}>
        <HBarChart data={risqueData} testId="chart-risque" />
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-border flex flex-col rounded-[4px] border p-4">
      <h3 className="mb-3 text-[13px] font-medium tracking-wide">{title}</h3>
      {children}
    </div>
  );
}
