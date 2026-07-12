import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { QualiteInbox } from "@/components/qualite/qualite-inbox";
import { QualiteTrendsView } from "@/components/qualite/qualite-trends";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getQualiteTrends, listQualiteInbox } from "@/lib/qualite/service";

// Hub email (mock) + tendances calculées côté base → toujours frais.
export const dynamic = "force-dynamic";

export default async function QualitePage() {
  if (!isFeatureEnabled("EMAIL_HUB")) notFound();

  const t = await getTranslations();
  const [inbox, trends] = await Promise.all([listQualiteInbox(), getQualiteTrends()]);

  return (
    <div>
      <section>
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("qualite.kicker")}
        </p>
        <h1 className="font-display mt-4 max-w-[24ch] text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-4xl">
          {t("qualite.title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[62ch] text-sm leading-relaxed">
          {t("qualite.subtitle")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium">{t("qualite.inbox.title")}</h2>
        <p className="text-muted-foreground mt-1 mb-3 text-xs">
          {t("qualite.inbox.subtitle")}
        </p>
        <QualiteInbox items={inbox} />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium">{t("qualite.trends.title")}</h2>
        <p className="text-muted-foreground mt-1 mb-3 text-xs">
          {t("qualite.trends.subtitle")}
        </p>
        <QualiteTrendsView trends={trends} />
      </section>
    </div>
  );
}
