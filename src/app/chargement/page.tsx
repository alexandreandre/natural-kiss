import { ArrowUpRight, Camera, CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LotStatusBadge } from "@/components/lots/lot-status-badge";
import { listChargementOverview } from "@/lib/chargement/service";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function ChargementPage() {
  if (!isFeatureEnabled("PORTAIL")) notFound();

  const t = await getTranslations();
  const rows = await listChargementOverview();

  return (
    <div>
      <section>
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("chargement.kicker")}
        </p>
        <h1 className="font-display mt-4 max-w-[24ch] text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-4xl">
          {t("chargement.title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[60ch] text-sm leading-relaxed">
          {t("chargement.subtitle")}
        </p>
      </section>

      <section className="mt-8">
        <ul className="divide-border/60 border-border divide-y rounded-[4px] border">
          {rows.map((r) => (
            <li key={r.lotId}>
              <Link
                href={`/lots/${r.lotId}`}
                className="hover:bg-accent/40 flex items-center justify-between gap-4 px-4 py-3.5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="font-mono text-[13px]">{r.reference}</span>
                    <ArrowUpRight className="text-muted-foreground/50 size-3.5" />
                  </p>
                  <p className="text-muted-foreground/80 mt-0.5 truncate text-xs">
                    {r.produit}
                    {r.clientNom ? ` · ${r.clientNom}` : ""}
                    {r.numeroConteneur ? ` · ${r.numeroConteneur}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {r.photoBoite ? (
                    <span className="text-primary inline-flex items-center gap-1.5 text-xs font-medium">
                      <CheckCircle2 className="size-3.5" />
                      {t("chargement.hasPhoto")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/70 inline-flex items-center gap-1.5 text-xs">
                      <Camera className="size-3.5" />
                      {t("chargement.preuveCount", { count: r.preuvesCount })}
                    </span>
                  )}
                  <LotStatusBadge statut={r.statut} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
