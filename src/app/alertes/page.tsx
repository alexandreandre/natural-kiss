import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AlerteSeverityBadge } from "@/components/alertes/alerte-severity-badge";
import { ScanAllButton } from "@/components/alertes/scan-all-button";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { listActiveAlertes } from "@/lib/alertes/service";

export const dynamic = "force-dynamic";

export default async function AlertesOverviewPage() {
  if (!isFeatureEnabled("COMPLETUDE")) notFound();

  const t = await getTranslations();
  const rows = await listActiveAlertes();

  return (
    <div>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
            <span className="bg-harvest inline-block size-2 rounded-[1px]" />
            {t("alertes.overview.kicker")}
          </p>
          <h1 className="font-display mt-4 max-w-[22ch] text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-4xl">
            {t("alertes.overview.title")}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-[60ch] text-sm leading-relaxed">
            {t("alertes.overview.subtitle")}
          </p>
        </div>
        <ScanAllButton />
      </section>

      <section className="mt-8">
        {rows.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-10 text-center text-sm">
            {t("alertes.none")}
          </p>
        ) : (
          <ul className="divide-border/60 border-border divide-y rounded-[4px] border">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/lots/${r.lotId}`}
                  className="hover:bg-accent/40 flex items-center justify-between gap-4 px-4 py-3.5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="font-mono text-[13px]">{r.reference}</span>
                      <ArrowUpRight className="text-muted-foreground/50 size-3.5" />
                      <span className="text-muted-foreground/80 text-xs font-normal">
                        {t(`alertes.type.${r.type}`)}
                      </span>
                    </p>
                    <p className="text-muted-foreground/80 mt-0.5 truncate text-xs">
                      {r.produit}
                      {r.clientNom ? ` · ${r.clientNom}` : ""} · {r.message}
                    </p>
                  </div>
                  <AlerteSeverityBadge
                    severite={r.severite}
                    label={t(`alertes.severite.${r.severite}`)}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
