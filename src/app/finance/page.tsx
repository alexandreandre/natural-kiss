import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PaiementStatusBadge } from "@/components/finance/finance-status-badge";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { listFinanceOverview } from "@/lib/finance/service";

export const dynamic = "force-dynamic";

export default async function FinanceOverviewPage() {
  if (!isFeatureEnabled("COMPLETUDE")) notFound();

  const t = await getTranslations();
  const rows = await listFinanceOverview();

  const order = { litige: 0, en_attente: 1, partiel: 2, a_venir: 3, paye: 4 } as const;
  const sorted = [...rows].sort((a, b) => order[a.paiementStatut] - order[b.paiementStatut]);

  return (
    <div>
      <section>
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("finance.overview.kicker")}
        </p>
        <h1 className="font-display mt-4 max-w-[22ch] text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-4xl">
          {t("finance.overview.title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[60ch] text-sm leading-relaxed">
          {t("finance.overview.subtitle")}
        </p>
      </section>

      <section className="mt-8">
        <ul className="divide-border/60 border-border divide-y rounded-[4px] border">
          {sorted.map((r) => (
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
                    {r.montant !== null ? ` · ${r.montant} ${r.devise}` : ""}
                    {r.litigesOuverts > 0
                      ? ` · ${t("finance.overview.litigesCount", { count: r.litigesOuverts })}`
                      : ""}
                  </p>
                </div>
                <PaiementStatusBadge
                  statut={r.paiementStatut}
                  label={t(`finance.payment.status.${r.paiementStatut}`)}
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
