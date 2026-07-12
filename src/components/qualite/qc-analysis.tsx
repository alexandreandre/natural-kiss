import { getTranslations } from "next-intl/server";

import type { QcAnalysis, QcSeverite, QcVerdict } from "@/lib/adapters/types";
import { cn } from "@/lib/utils";

const VERDICT_TONE: Record<QcVerdict, string> = {
  vert: "text-primary bg-primary/10 border-primary/25",
  orange: "text-harvest bg-harvest/10 border-harvest/30",
  rouge: "text-destructive bg-destructive/10 border-destructive/25",
};
const VERDICT_DOT: Record<QcVerdict, string> = {
  vert: "bg-primary",
  orange: "bg-harvest",
  rouge: "bg-destructive",
};

const SEV_TONE: Record<QcSeverite, string> = {
  critique: "border-destructive/30 bg-destructive/[0.06] text-destructive",
  majeur: "border-destructive/25 bg-destructive/[0.04] text-destructive",
  mineur: "border-harvest/30 bg-harvest/[0.06] text-harvest",
};
const SEV_DOT: Record<QcSeverite, string> = {
  critique: "bg-destructive",
  majeur: "bg-destructive/70",
  mineur: "bg-harvest",
};

/** Badge de verdict qualité (vert / orange / rouge) avec score optionnel. */
export async function QcVerdictBadge({
  verdict,
  score,
}: {
  verdict: QcVerdict;
  score?: number | null;
}) {
  const t = await getTranslations("lots.quality");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[13px] font-medium",
        VERDICT_TONE[verdict],
      )}
    >
      <span className={cn("size-1.5 rounded-full", VERDICT_DOT[verdict])} />
      {t(`verdict.${verdict}`)}
      {score !== null && score !== undefined && (
        <span className="font-mono tabular-nums">· {score}</span>
      )}
    </span>
  );
}

/** Bloc d'analyse IA structurée d'un rapport qualité (résumé + défauts). */
export async function QcAnalysisBlock({ analyse }: { analyse: QcAnalysis }) {
  const t = await getTranslations("qualite");
  const tq = await getTranslations("lots.quality");

  return (
    <div className="space-y-3">
      {analyse.resume && (
        <p className="text-foreground/90 text-sm leading-relaxed">{analyse.resume}</p>
      )}
      {analyse.defauts.length > 0 && (
        <div>
          <p className="text-muted-foreground/70 mb-2 font-mono text-[10px] tracking-[0.12em] uppercase">
            {tq("defects")}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {analyse.defauts.map((d) => (
              <li
                key={d.code}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 text-xs",
                  SEV_TONE[d.severite],
                )}
                title={`${t(`categorie.${d.categorie}`)} · ${t(`severite.${d.severite}`)}`}
              >
                <span className={cn("size-1.5 rounded-full", SEV_DOT[d.severite])} />
                {d.libelle}
                {d.tauxPct !== null && d.tauxPct !== undefined && (
                  <span className="font-mono tabular-nums">~{d.tauxPct}%</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {analyse.model && (
        <p className="text-muted-foreground/50 font-mono text-[10px]">
          {t("analyzedBy", { model: analyse.model })}
        </p>
      )}
    </div>
  );
}
