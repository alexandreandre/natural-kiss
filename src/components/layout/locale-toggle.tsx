"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { locales, type Locale } from "@/i18n/config";
import { setUserLocale } from "@/i18n/locale";

const LABELS: Record<Locale, string> = { fr: "Français", en: "English" };

export function LocaleToggle() {
  const current = useLocale();
  const router = useRouter();
  const t = useTranslations("nav");
  const [pending, startTransition] = useTransition();

  function select(locale: Locale) {
    startTransition(async () => {
      await setUserLocale(locale);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("language")}
            disabled={pending}
          >
            <Languages className="size-[1.15rem]" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => select(loc)}
            className={loc === current ? "text-primary font-semibold" : undefined}
          >
            <span className="w-6 text-xs uppercase tabular-nums">{loc}</span>
            {LABELS[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
