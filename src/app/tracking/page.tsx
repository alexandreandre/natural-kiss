import { AlertCircle, PackageSearch, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LotHeader } from "@/components/tracking/lot-header";
import { SearchForm } from "@/components/tracking/search-form";
import { TrackingVoyage } from "@/components/tracking/tracking-voyage";
import { resolveTracking, type TrackingResult } from "@/lib/tracking/service";

// Résultat dépendant de la requête + des données Supabase → pas de cache statique.
export const dynamic = "force-dynamic";

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const t = await getTranslations("tracking");
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (raw ?? "").trim();

  let result: TrackingResult | null = null;
  let dbError = false;
  if (query) {
    try {
      result = await resolveTracking(query);
    } catch {
      dbError = true;
    }
  }

  return (
    <div>
      <section>
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("kicker")}
        </p>
        <h1 className="font-display mt-4 max-w-[20ch] text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[54ch] text-sm leading-relaxed">
          {t("subtitle")}
        </p>

        <div className="mt-7 max-w-2xl">
          <SearchForm initialQuery={query} />
        </div>
      </section>

      {dbError ? (
        <div className="border-destructive/40 bg-destructive/5 text-destructive mt-10 flex items-center gap-3 rounded-[3px] border p-4 text-sm">
          <AlertCircle className="size-5 shrink-0" />
          {t("dbError")}
        </div>
      ) : query && !result ? (
        <div className="border-border mt-10 flex flex-col items-center gap-3 rounded-[4px] border border-dashed p-10 text-center">
          <SearchX className="text-muted-foreground/60 size-8" />
          <div>
            <p className="font-medium">{t("notFoundTitle", { query })}</p>
            <p className="text-muted-foreground mt-1 text-sm">{t("notFoundBody")}</p>
          </div>
        </div>
      ) : !query ? (
        <div className="border-border mt-10 flex flex-col items-center gap-3 rounded-[4px] border border-dashed p-10 text-center">
          <PackageSearch className="text-muted-foreground/50 size-8" />
          <div>
            <p className="font-medium">{t("emptyTitle")}</p>
            <p className="text-muted-foreground mt-1 max-w-[42ch] text-sm">
              {t("emptyBody")}
            </p>
          </div>
        </div>
      ) : result ? (
        <div className="mt-10 space-y-8">
          <LotHeader lot={result.lot} trackingRef={result.ref} />
          <TrackingVoyage result={result} />
        </div>
      ) : null}
    </div>
  );
}
