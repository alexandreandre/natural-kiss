import {
  FileText,
  Leaf,
  ClipboardCheck,
  Inbox,
  ArrowRight,
  Camera,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { QcAnalysisBlock, QcVerdictBadge } from "@/components/qualite/qc-analysis";
import { OriginSyncButton } from "@/components/lots/origin-sync-button";
import { cn } from "@/lib/utils";
import type { QcComparison } from "@/lib/qualite/service";
import type {
  DocumentStatut,
  LotDocument,
  LotOrigine,
  LotQualityReport,
  QcVerdict,
} from "@/lib/data/lots";

function EmptyState({ hint, children }: { hint: string; children: React.ReactNode }) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-[4px] border border-dashed p-10 text-center">
      <Inbox className="text-muted-foreground/50 size-7" />
      <p className="text-muted-foreground text-sm">{children}</p>
      <p className="text-muted-foreground/60 max-w-[42ch] text-xs">{hint}</p>
    </div>
  );
}

const DOC_STATUT_TONE: Record<DocumentStatut, string> = {
  recu: "text-muted-foreground",
  verifie: "text-primary",
  anomalie: "text-destructive",
};

const DOC_STATUT_DOT: Record<DocumentStatut, string> = {
  recu: "bg-muted-foreground/45",
  verifie: "bg-primary",
  anomalie: "bg-destructive",
};

export async function DocumentsSection({ documents }: { documents: LotDocument[] }) {
  const t = await getTranslations("lots.documents");

  if (documents.length === 0) {
    return <EmptyState hint={t("hint")}>{t("empty")}</EmptyState>;
  }

  return (
    <ul className="divide-border/60 border-border divide-y rounded-[4px] border">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="text-muted-foreground/70 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{t(`type.${doc.type}`)}</p>
              <p className="text-muted-foreground/70 truncate font-mono text-[11px]">
                {doc.nomFichier}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium",
              DOC_STATUT_TONE[doc.statut],
            )}
          >
            <span className={cn("size-1.5 rounded-full", DOC_STATUT_DOT[doc.statut])} />
            {t(`status.${doc.statut}`)}
          </span>
        </li>
      ))}
    </ul>
  );
}

const QC_VERDICT_TONE: Record<QcVerdict, string> = {
  vert: "text-primary",
  orange: "text-harvest",
  rouge: "text-destructive",
};
const QC_VERDICT_DOT: Record<QcVerdict, string> = {
  vert: "bg-primary",
  orange: "bg-harvest",
  rouge: "bg-destructive",
};

async function QcComparisonStrip({ comparison }: { comparison: QcComparison }) {
  const t = await getTranslations("qualite.comparison");
  const format = await getFormatter();
  const { departPhoto, retour } = comparison;
  if (!departPhoto && !retour) return null;

  return (
    <div className="border-border bg-muted/20 flex flex-col gap-3 rounded-[4px] border p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Camera className="text-muted-foreground/70 size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.12em] uppercase">
            {t("depart")}
          </p>
          <p className="truncate text-sm font-medium">
            {departPhoto
              ? departPhoto.priseLe
                ? format.dateTime(new Date(departPhoto.priseLe), {
                    dateStyle: "medium",
                  })
                : t("photoPresent")
              : t("noPhoto")}
          </p>
        </div>
      </div>
      <ArrowRight className="text-muted-foreground/40 hidden size-4 shrink-0 sm:block" />
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <ClipboardCheck className="text-muted-foreground/70 size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.12em] uppercase">
            {t("retour")}
          </p>
          {retour ? (
            <div className="mt-0.5">
              <QcVerdictBadge verdict={retour.verdict} score={retour.score} />
            </div>
          ) : (
            <p className="text-sm font-medium">{t("noRetour")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export async function QualitySection({
  reports,
  comparison,
}: {
  reports: LotQualityReport[];
  comparison?: QcComparison | null;
}) {
  const t = await getTranslations("lots.quality");
  const format = await getFormatter();

  const showComparison =
    comparison && (comparison.departPhoto || comparison.retour) && reports.length > 0;

  if (reports.length === 0) {
    return <EmptyState hint={t("hint")}>{t("empty")}</EmptyState>;
  }

  return (
    <div className="space-y-4">
      {showComparison && <QcComparisonStrip comparison={comparison} />}
      {reports.map((r) => (
        <div key={r.id} className="border-border rounded-[4px] border p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="text-muted-foreground/70 size-4" />
              <div>
                <p className="text-sm font-medium">{t(`source.${r.source}`)}</p>
                <p className="text-muted-foreground/70 font-mono text-[11px] tabular-nums">
                  {r.recuLe
                    ? format.dateTime(new Date(r.recuLe), { dateStyle: "medium" })
                    : null}
                  {r.recuLe && r.nomFichier ? " · " : ""}
                  {r.nomFichier ?? ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {r.score !== null && (
                <span className="text-muted-foreground text-xs">
                  {t("score")}{" "}
                  <span className="text-foreground font-mono text-sm font-medium tabular-nums">
                    {r.score}
                  </span>
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[13px] font-medium",
                  QC_VERDICT_TONE[r.verdict],
                )}
              >
                <span
                  className={cn("size-1.5 rounded-full", QC_VERDICT_DOT[r.verdict])}
                />
                {t(`verdict.${r.verdict}`)}
              </span>
            </div>
          </div>

          {r.analyse ? (
            <div className="border-border/60 mt-3.5 border-t pt-3.5">
              <QcAnalysisBlock analyse={r.analyse} />
            </div>
          ) : (
            r.defauts.length > 0 && (
              <div className="border-border/60 mt-3.5 border-t pt-3.5">
                <p className="text-muted-foreground/70 mb-2 font-mono text-[10px] tracking-[0.12em] uppercase">
                  {t("defects")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {r.defauts.map((d) => (
                    <span
                      key={d}
                      className="border-border bg-muted/40 rounded-[3px] border px-2 py-0.5 text-xs"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
}

export async function OriginSection({
  lotId,
  origines,
}: {
  lotId: string;
  origines: LotOrigine[];
}) {
  const t = await getTranslations("lots.origin");
  const format = await getFormatter();

  if (origines.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState hint={t("hint")}>{t("empty")}</EmptyState>
        <div className="flex justify-center">
          <OriginSyncButton lotId={lotId} />
        </div>
      </div>
    );
  }

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.12em] uppercase">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <OriginSyncButton lotId={lotId} />
      </div>
      {origines.map((o) => (
        <div key={o.id} className="border-border rounded-[4px] border p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <Leaf className="text-primary size-4" />
            <p className="font-medium">{o.site}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Field label={t("plot")} value={o.parcelle ?? "—"} />
            <Field label={t("variety")} value={o.variete ?? "—"} />
            <Field
              label={t("harvest")}
              value={
                o.dateRecolte
                  ? format.dateTime(new Date(o.dateRecolte), { dateStyle: "medium" })
                  : "—"
              }
            />
            <Field
              label={t("treatments")}
              value={o.traitements.length > 0 ? o.traitements.join(", ") : "—"}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
