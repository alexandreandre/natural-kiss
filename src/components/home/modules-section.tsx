import { useTranslations } from "next-intl";

import { ModuleCard } from "@/components/home/module-card";
import { STRATE_ORDER, modulesByStrate } from "@/lib/modules";

export function ModulesSection() {
  const t = useTranslations();

  return (
    <section className="mt-14">
      <header className="mb-8">
        <h2 className="font-display text-xl font-medium tracking-tight">
          {t("home.modulesTitle")}
        </h2>
        <p className="text-muted-foreground mt-1.5 max-w-[60ch] text-sm">
          {t("home.modulesSubtitle")}
        </p>
      </header>

      <div className="space-y-10">
        {STRATE_ORDER.map((strate, i) => (
          <div key={strate}>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-harvest font-mono text-[11px] font-medium tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-foreground text-[13px] font-medium tracking-wide">
                {t(`strate.${strate}`)}
              </h3>
              <span className="border-border/70 h-px flex-1 border-t" />
            </div>
            <div className="bg-border/70 grid grid-cols-1 gap-px overflow-hidden rounded-[3px] sm:grid-cols-2 lg:grid-cols-3">
              {modulesByStrate(strate).map((m) => (
                <ModuleCard key={m.id} module={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
