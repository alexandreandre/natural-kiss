import { ArrowUpRight, PackageSearch } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LotStatusBadge } from "@/components/lots/lot-status-badge";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { listMyLots } from "@/lib/portail/data";
import { requirePortailContext } from "@/lib/portail/session";

export const dynamic = "force-dynamic";

export default async function PortailHomePage() {
  if (!isFeatureEnabled("PORTAIL")) notFound();

  const ctx = await requirePortailContext();
  const t = await getTranslations("portail");
  const format = await getFormatter();
  const lots = await listMyLots();

  return (
    <div>
      <section>
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("kicker")}
        </p>
        <h1 className="font-display mt-4 text-3xl leading-[1.05] font-medium tracking-tight sm:text-4xl">
          {t("welcome", { client: ctx.client.nom })}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[60ch] text-sm leading-relaxed">
          {t("subtitle")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-muted-foreground/70 mb-3 font-mono text-[10px] tracking-[0.14em] uppercase">
          {t("myLots", { count: lots.length })}
        </h2>

        {lots.length === 0 ? (
          <div className="border-border flex flex-col items-center gap-3 rounded-[4px] border border-dashed p-10 text-center">
            <PackageSearch className="text-muted-foreground/50 size-7" />
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          </div>
        ) : (
          <ul className="divide-border/60 border-border divide-y rounded-[4px] border">
            {lots.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/portail/lots/${l.id}`}
                  className="hover:bg-accent/40 flex items-center justify-between gap-4 px-4 py-3.5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="font-mono text-[13px]">{l.reference}</span>
                      <ArrowUpRight className="text-muted-foreground/50 size-3.5" />
                    </p>
                    <p className="text-muted-foreground/80 mt-0.5 truncate text-xs">
                      {l.produit}
                      {l.variete ? ` · ${l.variete}` : ""}
                      {l.destinationPort ? ` → ${l.destinationPort}` : ""}
                    </p>
                    {l.dateDepart && (
                      <p className="text-muted-foreground/60 mt-1 font-mono text-[11px] tabular-nums">
                        {format.dateTime(new Date(l.dateDepart), { dateStyle: "medium" })}
                      </p>
                    )}
                  </div>
                  <LotStatusBadge statut={l.statut} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
