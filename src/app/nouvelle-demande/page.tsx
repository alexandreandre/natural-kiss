import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PublicDemandeForm } from "@/components/onboarding/public-demande-form";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function NouvelleDemandePage() {
  if (!isFeatureEnabled("ONBOARDING")) notFound();
  const t = await getTranslations("nouvelleDemande");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col">
      <header className="border-border/70 mb-8 flex items-center justify-between gap-3 border-b pb-5">
        <Logo />
        <div className="flex items-center gap-1.5">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </header>

      <section className="mb-8">
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("kicker")}
        </p>
        <h1 className="font-display mt-4 text-3xl leading-[1.05] font-medium tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[60ch] text-sm leading-relaxed">
          {t("subtitle")}
        </p>
      </section>

      <PublicDemandeForm />
    </div>
  );
}
