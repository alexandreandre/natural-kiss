import { AlertCircle, PackageOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LotsPreview } from "@/components/home/lots-preview";
import { ModulesSection } from "@/components/home/modules-section";
import { listLots, type LotListItem } from "@/lib/data/lots";

// Données de démo évolutives → rendu dynamique (pas de cache statique).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getTranslations();

  let lots: LotListItem[] = [];
  let dbError = false;
  try {
    lots = await listLots(8);
  } catch {
    dbError = true;
  }

  return (
    <div>
      {/* Hero */}
      <section className="from-primary/10 via-background to-background relative overflow-hidden rounded-2xl border bg-gradient-to-br p-8 sm:p-12">
        <p className="text-primary text-xs font-semibold tracking-wider uppercase">
          {t("home.heroKicker")}
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("home.heroTitle")}
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-sm sm:text-base">
          {t("home.heroSubtitle")}
        </p>
      </section>

      {/* Lots récents (données Supabase) */}
      <section className="mt-14">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight">
            {t("home.recentLotsTitle")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("home.recentLotsSubtitle")}
          </p>
        </div>

        {dbError ? (
          <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-center gap-3 rounded-xl border p-4 text-sm">
            <AlertCircle className="size-5 shrink-0" />
            {t("home.dbError")}
          </div>
        ) : lots.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-3 rounded-xl border border-dashed p-6 text-sm">
            <PackageOpen className="size-5 shrink-0" />
            {t("home.noLots")}
          </div>
        ) : (
          <LotsPreview lots={lots} />
        )}
      </section>

      <ModulesSection />
    </div>
  );
}
