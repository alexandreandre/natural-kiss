import { ArrowLeft, ArrowRight, FileText, ImageOff, MapPin } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LotStatusBadge } from "@/components/lots/lot-status-badge";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getMyLot, getMyLotDetail } from "@/lib/portail/data";
import { requirePortailContext } from "@/lib/portail/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-muted-foreground/70 mb-3 font-mono text-[10px] tracking-[0.14em] uppercase">
      {children}
    </h2>
  );
}

export default async function PortailLotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isFeatureEnabled("PORTAIL")) notFound();

  await requirePortailContext();
  const { id } = await params;
  const t = await getTranslations();
  const format = await getFormatter();

  const lot = await getMyLot(id);
  if (!lot) {
    // RLS : un lot d'un autre client est indissociable d'un lot inexistant.
    return (
      <div>
        <Link
          href="/portail"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" />
          {t("portail.backToLots")}
        </Link>
        <div className="border-border mt-10 rounded-[4px] border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">{t("portail.notFound")}</p>
        </div>
      </div>
    );
  }

  const detail = await getMyLotDetail(lot.id);
  const photos = detail.preuves.filter((p) => p.type === "photo_boite");

  return (
    <div className="space-y-8">
      <Link
        href="/portail"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        {t("portail.backToLots")}
      </Link>

      {/* En-tête */}
      <header className="border-border rounded-[4px] border p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground/70 font-mono text-[11px] tracking-[0.14em] uppercase">
              {lot.reference}
            </p>
            <h1 className="font-display mt-1.5 text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
              {lot.produit}
              {lot.variete ? (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {lot.variete}
                </span>
              ) : null}
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
              <span>{lot.originePort ?? "—"}</span>
              <ArrowRight className="text-muted-foreground/50 size-3.5" />
              <span className="text-foreground font-medium">
                {lot.destinationPort ?? lot.destinationPays ?? "—"}
              </span>
            </p>
          </div>
          <LotStatusBadge statut={lot.statut} />
        </div>
        <div className="border-border/60 mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-4">
          <Field label={t("tracking.header.container")}>
            <span className="font-mono text-[13px]">
              {lot.numeroConteneur ?? t("lots.noContainer")}
            </span>
          </Field>
          <Field label={t("tracking.header.mode")}>
            {t(`tracking.modes.${lot.mode}`)}
          </Field>
          <Field label={t("portail.detail.departure")}>
            {lot.dateDepart
              ? format.dateTime(new Date(lot.dateDepart), { dateStyle: "medium" })
              : "—"}
          </Field>
          <Field label={t("portail.detail.arrival")}>
            {lot.dateArriveeReelle
              ? format.dateTime(new Date(lot.dateArriveeReelle), {
                  dateStyle: "medium",
                })
              : lot.dateArriveePrevue
                ? format.dateTime(new Date(lot.dateArriveePrevue), {
                    dateStyle: "medium",
                  })
                : "—"}
          </Field>
        </div>
      </header>

      {/* Photo boîte produit (preuve visible client) */}
      <section>
        <SectionTitle>{t("portail.detail.photoTitle")}</SectionTitle>
        {photos.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-6 text-center text-sm">
            {t("portail.detail.noPhoto")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <div
                key={p.id}
                className="border-border overflow-hidden rounded-[4px] border"
              >
                <div className="bg-muted/40 flex aspect-4/3 items-center justify-center">
                  {p.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.signedUrl}
                      alt={t("portail.detail.photoTitle")}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageOff className="text-muted-foreground/50 size-6" />
                  )}
                </div>
                {p.priseLe && (
                  <p className="text-muted-foreground/70 p-2 font-mono text-[10px] tabular-nums">
                    {format.dateTime(new Date(p.priseLe), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Frise d'événements */}
      {detail.events.length > 0 && (
        <section>
          <SectionTitle>{t("portail.detail.timelineTitle")}</SectionTitle>
          <ol className="relative">
            {detail.events.map((e, i) => {
              const isLast = i === detail.events.length - 1;
              return (
                <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="bg-primary/40 absolute top-6 -bottom-0 left-[13px] w-px"
                    />
                  )}
                  <span className="border-primary/50 bg-primary/10 text-primary relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border">
                    <MapPin className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-sm font-medium">
                        {t(`tracking.eventCodes.${e.code}`)}
                      </span>
                      <time
                        className="text-muted-foreground/80 font-mono text-[11px] tabular-nums"
                        dateTime={e.at}
                      >
                        {format.dateTime(new Date(e.at), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-[13px]">
                      {e.label}
                    </p>
                    {e.lieu && (
                      <p className="text-muted-foreground/70 mt-1 flex items-center gap-1 text-xs">
                        <MapPin className="size-3" />
                        {e.lieu}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Documents autorisés */}
      <section>
        <SectionTitle>{t("portail.detail.documentsTitle")}</SectionTitle>
        {detail.documents.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-6 text-center text-sm">
            {t("portail.detail.noDocuments")}
          </p>
        ) : (
          <ul className="divide-border/60 border-border divide-y rounded-[4px] border">
            {detail.documents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <FileText className="text-muted-foreground/70 size-4 shrink-0" />
                <span className="text-sm font-medium">
                  {t(`lots.documents.type.${d.type}`)}
                </span>
                <span className="text-muted-foreground/60 truncate font-mono text-[11px]">
                  {d.nomFichier}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Retours qualité */}
      {detail.qualite.length > 0 && (
        <section>
          <SectionTitle>{t("portail.detail.qualityTitle")}</SectionTitle>
          <ul className="space-y-3">
            {detail.qualite.map((q) => (
              <li key={q.id} className="border-border rounded-[4px] border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    {t(`lots.quality.source.${q.source}`)}
                  </span>
                  <span
                    className={cn(
                      "text-[13px] font-medium",
                      q.verdict === "vert"
                        ? "text-primary"
                        : q.verdict === "orange"
                          ? "text-harvest"
                          : "text-destructive",
                    )}
                  >
                    {t(`lots.quality.verdict.${q.verdict}`)}
                  </span>
                </div>
                {q.defauts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {q.defauts.map((d) => (
                      <span
                        key={d}
                        className="border-border bg-muted/40 rounded-[3px] border px-2 py-0.5 text-xs"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.12em] uppercase">
        {label}
      </span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}
