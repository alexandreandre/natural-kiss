import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { RiskBand, RiskFactor, RiskResult } from "@/lib/tracking/risk";

const BAND_TEXT: Record<RiskBand, string> = {
  faible: "text-primary",
  moyen: "text-harvest",
  eleve: "text-destructive",
};
const BAND_BAR: Record<RiskBand, string> = {
  faible: "bg-primary",
  moyen: "bg-harvest",
  eleve: "bg-destructive",
};

function FactorRow({ factor }: { factor: RiskFactor }) {
  const t = useTranslations("tracking");
  const pct = Math.round((factor.points / factor.max) * 100);
  const measured =
    factor.key === "excursion"
      ? `+${factor.measured.toFixed(1)} °C`
      : `${Math.round(factor.measured)} ${t("risk.dayUnit")}`;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px]">{t(`risk.factors.${factor.key}`)}</span>
        <span className="text-muted-foreground/80 font-mono text-[11px] tabular-nums">
          {measured}
        </span>
      </div>
      <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
        <span
          className={cn(
            "block h-full rounded-full",
            pct >= 70 ? "bg-destructive" : pct >= 40 ? "bg-harvest" : "bg-primary/70",
          )}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

export function RiskGauge({ risk }: { risk: RiskResult }) {
  const t = useTranslations("tracking");
  const high = risk.band === "eleve";

  return (
    <div className="border-border flex h-full flex-col rounded-[4px] border p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-medium tracking-wide">{t("risk.title")}</h3>
        {high ? (
          <AlertTriangle className="text-destructive size-4" />
        ) : (
          <ShieldCheck className="text-primary size-4" />
        )}
      </div>

      <div className="mt-4 flex items-end gap-3">
        <span
          className={cn(
            "font-mono text-5xl leading-none font-medium tabular-nums",
            BAND_TEXT[risk.band],
          )}
        >
          {String(risk.score).padStart(2, "0")}
        </span>
        <span className="text-muted-foreground/70 pb-1 font-mono text-[11px] tracking-[0.1em] uppercase">
          / 100
        </span>
      </div>
      <span className={cn("mt-1 text-sm font-medium", BAND_TEXT[risk.band])}>
        {t(`risk.band.${risk.band}`)}
      </span>

      {/* Barre de score globale. */}
      <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
        <span
          className={cn("block h-full rounded-full", BAND_BAR[risk.band])}
          style={{ width: `${Math.max(risk.score, 2)}%` }}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3.5">
        {risk.factors.map((f) => (
          <FactorRow key={f.key} factor={f} />
        ))}
      </div>

      <p className="text-muted-foreground/60 mt-auto pt-4 text-[11px] leading-relaxed">
        {t("risk.computed")}
      </p>
    </div>
  );
}
