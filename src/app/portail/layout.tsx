import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { getPortailContext } from "@/lib/portail/session";

export const dynamic = "force-dynamic";

/**
 * Chrome du portail client (T1) — distinct de la navigation interne. Affiche le
 * client connecté et un bouton de déconnexion. La garde d'accès est faite par
 * chaque page protégée (`requirePortailContext`), pas ici, afin de ne pas créer
 * de boucle avec `/portail/login`.
 */
export default async function PortailLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("portail");
  const ctx = await getPortailContext();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col">
      <header className="border-border/70 mb-8 flex items-center justify-between gap-3 border-b pb-5">
        <Link
          href="/portail"
          className="flex items-center gap-3"
          aria-label="Natural Kiss"
        >
          <Logo />
          <span className="border-border/70 text-muted-foreground hidden border-l pl-3 font-mono text-[10px] tracking-[0.14em] uppercase sm:inline">
            {t("space")}
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          {ctx && (
            <span className="text-muted-foreground mr-1 hidden text-sm sm:inline">
              {ctx.client.nom}
            </span>
          )}
          <LocaleToggle />
          <ThemeToggle />
          {ctx && (
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" />
                {t("logout")}
              </Button>
            </form>
          )}
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
