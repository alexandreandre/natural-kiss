import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GateStatusBadge } from "@/components/gate/gate-status-badge";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { listGateOverview } from "@/lib/gate/service";

// Statut de Gate calculé côté base → toujours frais.
export const dynamic = "force-dynamic";

export default async function GateOverviewPage() {
  if (!isFeatureEnabled("GATE")) notFound();

  const t = await getTranslations();
  const rows = await listGateOverview();

  const order = { rouge: 0, en_attente: 1, vert: 2 } as const;
  const sorted = [...rows].sort((a, b) => order[a.statut] - order[b.statut]);

  return (
    <div>
      <section>
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("gate.overview.kicker")}
        </p>
        <h1 className="font-display mt-4 max-w-[22ch] text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-4xl">
          {t("gate.overview.title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[60ch] text-sm leading-relaxed">
          {t("gate.overview.subtitle")}
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
                    {r.destinationPays ? ` · ${r.destinationPays}` : ""}
                  </p>
                </div>
                <GateStatusBadge
                  statut={r.statut}
                  label={t(`gate.status.${r.statut}`)}
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
