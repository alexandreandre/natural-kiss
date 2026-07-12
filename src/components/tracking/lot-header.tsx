import { ArrowRight, Snowflake } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { LotStatusBadge } from "@/components/lots/lot-status-badge";
import { ModeIcon } from "@/components/tracking/mode-icon";
import type { LotTracking } from "@/lib/data/lots";

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

export function LotHeader({
  lot,
  trackingRef,
}: {
  lot: LotTracking;
  trackingRef: string;
}) {
  const t = useTranslations("tracking");
  const format = useFormatter();

  const consigne =
    lot.temperatureConsigneC === null ? "—" : `${lot.temperatureConsigneC} °C`;
  const harvest = lot.harvestDate
    ? format.dateTime(new Date(lot.harvestDate), { dateStyle: "medium" })
    : "—";

  return (
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

      <div className="border-border/60 mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-3 lg:grid-cols-5">
        <Field label={t("header.client")}>{lot.clientNom ?? "—"}</Field>
        <Field label={t("header.mode")}>
          <span className="inline-flex items-center gap-1.5">
            <ModeIcon mode={lot.mode} className="text-muted-foreground size-3.5" />
            {t(`modes.${lot.mode}`)}
          </span>
        </Field>
        <Field label={t("header.container")}>
          <span className="font-mono text-[13px]">{trackingRef}</span>
        </Field>
        <Field label={t("header.consigne")}>
          <span className="inline-flex items-center gap-1.5">
            <Snowflake className="text-muted-foreground size-3.5" />
            {consigne}
          </span>
        </Field>
        <Field label={t("header.harvest")}>{harvest}</Field>
      </div>

      {lot.transporteurNom ? (
        <p className="text-muted-foreground/80 mt-4 text-xs">
          {t("header.carrier")} · {lot.transporteurNom}
        </p>
      ) : null}
    </header>
  );
}
