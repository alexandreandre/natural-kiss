import { PackageX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { LotsFilters } from "@/components/lots/lots-filters";
import { LotsTable } from "@/components/lots/lots-table";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  getLotFilterOptions,
  listLotsFiltered,
  type LotFilters,
  type LotStatut,
} from "@/lib/data/lots";

// Liste dépendante des filtres (searchParams) + données Supabase.
export const dynamic = "force-dynamic";

const STATUTS: LotStatut[] = [
  "booking",
  "chargement",
  "transit",
  "arrive",
  "livre",
  "cloture",
  "rejete",
];

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  return t ? t : undefined;
}

export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isFeatureEnabled("LOTS")) notFound();

  const t = await getTranslations();
  const params = await searchParams;

  const statutRaw = first(params.statut);
  const filters: LotFilters = {
    clientId: first(params.client),
    produit: first(params.produit),
    pays: first(params.pays),
    statut:
      statutRaw && STATUTS.includes(statutRaw as LotStatut)
        ? (statutRaw as LotStatut)
        : undefined,
  };

  const [lots, options] = await Promise.all([
    listLotsFiltered(filters),
    getLotFilterOptions(),
  ]);

  return (
    <div>
      <section>
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("lots.kicker")}
        </p>
        <h1 className="font-display mt-4 max-w-[20ch] text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-4xl">
          {t("lots.title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[60ch] text-sm leading-relaxed">
          {t("lots.subtitle")}
        </p>
      </section>

      <section className="mt-8">
        <LotsFilters options={options} />
      </section>

      <section className="mt-6">
        <p className="text-muted-foreground/80 mb-3 font-mono text-[11px] tracking-[0.1em] tabular-nums">
          {t("lots.count", { count: lots.length })}
        </p>

        {lots.length === 0 ? (
          <div className="border-border flex flex-col items-center gap-3 rounded-[4px] border border-dashed p-10 text-center">
            <PackageX className="text-muted-foreground/50 size-8" />
            <p className="text-muted-foreground text-sm">{t("lots.empty")}</p>
          </div>
        ) : (
          <LotsTable lots={lots} />
        )}
      </section>
    </div>
  );
}
