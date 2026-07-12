import { ArrowRight, Ship } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { ModulesSection } from "@/components/home/modules-section";
import { buttonVariants } from "@/components/ui/button";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const t = await getTranslations();
  const trackingOn = isFeatureEnabled("TRACKING");

  return (
    <div>
      {/* Accueil épuré : une accroche claire + une action évidente. */}
      <section className="py-4">
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("home.heroKicker")}
        </p>
        <h1 className="font-display mt-5 max-w-[18ch] text-4xl leading-[1.05] font-medium tracking-tight text-balance sm:text-5xl">
          {t("home.heroTitle")}
        </h1>
        <p className="text-muted-foreground mt-4 max-w-[46ch] text-base">
          {t("home.heroSubtitle")}
        </p>

        {trackingOn && (
          <div className="mt-7">
            <Link
              href="/tracking"
              className={cn(buttonVariants({ size: "lg" }), "h-11 gap-2 px-5 text-sm")}
            >
              <Ship className="size-4" />
              {t("home.ctaTrack")}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </section>

      <ModulesSection />
    </div>
  );
}
