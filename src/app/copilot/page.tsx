import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { CopilotExplorer } from "@/components/copilot/copilot-explorer";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { listThreads } from "@/lib/copilot/service";

export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  if (!isFeatureEnabled("COMPLETUDE")) notFound();

  const t = await getTranslations();
  const threads = await listThreads();

  return (
    <div>
      <section>
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("copilot.overview.kicker")}
        </p>
        <h1 className="font-display mt-4 max-w-[22ch] text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-4xl">
          {t("copilot.overview.title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[60ch] text-sm leading-relaxed">
          {t("copilot.overview.subtitle")}
        </p>
      </section>

      <section className="mt-8">
        <CopilotExplorer threads={threads} />
      </section>
    </div>
  );
}
