import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileText,
  MailCheck,
  MinusCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { DocumentUpload } from "@/components/gate/document-upload";
import { GateRunButton } from "@/components/gate/gate-run-button";
import { GateStatusBadge } from "@/components/gate/gate-status-badge";
import type { ConformiteStatut } from "@/lib/gate/rules";
import type { GateData } from "@/lib/gate/service";
import { cn } from "@/lib/utils";
import type { AnomalieSeverite } from "@/lib/adapters/types";

const CONF_TONE: Record<ConformiteStatut, string> = {
  ok: "text-primary",
  manquant: "text-destructive",
  non_conforme: "text-destructive",
  non_applicable: "text-muted-foreground/60",
};

function ConfIcon({ statut }: { statut: ConformiteStatut }) {
  const cls = cn("size-4 shrink-0", CONF_TONE[statut]);
  if (statut === "ok") return <CheckCircle2 className={cls} />;
  if (statut === "non_applicable") return <MinusCircle className={cls} />;
  if (statut === "manquant") return <Circle className={cls} />;
  return <XCircle className={cls} />;
}

const SEV_TONE: Record<AnomalieSeverite, string> = {
  critique: "text-destructive border-destructive/30 bg-destructive/[0.06]",
  majeure: "text-destructive border-destructive/25 bg-destructive/[0.04]",
  mineure: "text-harvest border-harvest/30 bg-harvest/[0.06]",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground/70 mb-3 font-mono text-[10px] tracking-[0.14em] uppercase">
      {children}
    </h3>
  );
}

export async function GatePanel({ lotId, data }: { lotId: string; data: GateData }) {
  const t = await getTranslations();
  const format = await getFormatter();

  const summary =
    data.statut === "en_attente"
      ? t("gate.help.en_attente")
      : data.statut === "vert"
        ? t("gate.help.vert")
        : t("gate.help.rouge", {
            anomalies: data.anomaliesBloquantes,
            conformite: data.conformiteKo,
          });

  return (
    <div className="space-y-7">
      {/* ── Bandeau de statut + action ─────────────────────────────── */}
      <div className="border-border rounded-[4px] border p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-muted-foreground/70 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
              <ShieldCheck className="size-3.5" />
              {t("gate.gateTitle")}
            </p>
            <div className="mt-3">
              <GateStatusBadge
                statut={data.statut}
                label={t(`gate.status.${data.statut}`)}
              />
            </div>
            <p className="text-muted-foreground mt-3 max-w-[52ch] text-sm">{summary}</p>
            {data.mailEnvoye && (
              <p className="text-primary mt-2 inline-flex items-center gap-1.5 text-xs font-medium">
                <MailCheck className="size-3.5" />
                {t("gate.mailSent")}
              </p>
            )}
          </div>
          <GateRunButton lotId={lotId} />
        </div>
      </div>

      {/* ── Checklist de conformité ────────────────────────────────── */}
      <section>
        <SectionTitle>{t("gate.conformite.title")}</SectionTitle>
        {data.conformite.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-6 text-center text-sm">
            {t("gate.conformite.empty")}
          </p>
        ) : (
          <ul className="divide-border/60 border-border divide-y rounded-[4px] border">
            {data.conformite.map((c) => (
              <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                <ConfIcon statut={c.statut} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{c.libelle}</p>
                    <span
                      className={cn("text-[13px] font-medium", CONF_TONE[c.statut])}
                    >
                      {t(`gate.confStatut.${c.statut}`)}
                    </span>
                  </div>
                  {c.message && (
                    <p className="text-muted-foreground/80 mt-0.5 text-xs">
                      {c.message}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Anomalies documentaires (vérificateur IA) ──────────────── */}
      <section>
        <SectionTitle>{t("gate.anomalies.title")}</SectionTitle>
        {data.conformite.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-6 text-center text-sm">
            {t("gate.anomalies.pending")}
          </p>
        ) : data.anomalies.length === 0 ? (
          <p className="text-primary border-primary/20 bg-primary/[0.05] inline-flex items-center gap-2 rounded-[4px] border px-4 py-3 text-sm">
            <CheckCircle2 className="size-4" />
            {t("gate.anomalies.none")}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {data.anomalies.map((a) => (
              <li
                key={a.id}
                className={cn("rounded-[4px] border p-3.5", SEV_TONE[a.severite])}
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {t(`gate.severite.${a.severite}`)}
                      {a.champ && (
                        <span className="text-muted-foreground/70 font-mono text-[11px]">
                          {a.champ}
                        </span>
                      )}
                    </p>
                    <p className="text-foreground/90 mt-0.5 text-[13px]">{a.message}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Pièces du dossier ──────────────────────────────────────── */}
      <section>
        <SectionTitle>{t("gate.documents.title")}</SectionTitle>
        <DocumentUpload lotId={lotId} />
        {data.documents.length > 0 && (
          <ul className="divide-border/60 border-border mt-3 divide-y rounded-[4px] border">
            {data.documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <FileText className="text-muted-foreground/70 size-4 shrink-0" />
                  <span className="text-sm font-medium">
                    {t(`lots.documents.type.${d.type}`)}
                  </span>
                  <span className="text-muted-foreground/60 truncate font-mono text-[11px]">
                    {d.nomFichier}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[12px] font-medium",
                    d.statut === "anomalie"
                      ? "text-destructive"
                      : d.statut === "verifie"
                        ? "text-primary"
                        : "text-muted-foreground",
                  )}
                >
                  {t(`lots.documents.status.${d.statut}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Journal de la Gate ─────────────────────────────────────── */}
      {data.journal.length > 0 && (
        <section>
          <SectionTitle>{t("gate.journal.title")}</SectionTitle>
          <ul className="space-y-2">
            {data.journal.map((j) => (
              <li key={j.id} className="flex items-start gap-2.5 text-sm">
                <MailCheck className="text-primary mt-0.5 size-4 shrink-0" />
                <div>
                  <p>{j.message ?? t(`gate.journal.${j.evenement}`)}</p>
                  <p className="text-muted-foreground/60 font-mono text-[11px] tabular-nums">
                    {format.dateTime(new Date(j.createdAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {j.destinataire ? ` · ${j.destinataire}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
