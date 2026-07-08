import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export async function AppShell({ children }: { children: ReactNode }) {
  const t = await getTranslations();

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-muted-foreground hidden text-xs sm:inline">
              {t("app.tagline")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-xs sm:px-6">
          <span className="text-foreground font-medium">{t("app.name")}</span>
          <span>{t("footer.built")}</span>
        </div>
      </footer>
    </div>
  );
}
