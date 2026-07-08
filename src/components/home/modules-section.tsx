import { useTranslations } from "next-intl";

import { ModuleCard } from "@/components/home/module-card";
import { modulesByStrate, STRATE_ORDER } from "@/lib/modules";

export function ModulesSection() {
  const t = useTranslations();

  return (
    <section className="mt-14">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("home.modulesTitle")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("home.modulesSubtitle")}
        </p>
      </div>

      <div className="space-y-8">
        {STRATE_ORDER.map((strate) => (
          <div key={strate}>
            <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
              {t(`strate.${strate}`)}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
