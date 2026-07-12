"use client";

import { ScanLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { runAlertScanAllAction } from "@/lib/alertes/actions";
import { cn } from "@/lib/utils";

export function ScanAllButton() {
  const t = useTranslations("alertes");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await runAlertScanAllAction();
          router.refresh();
        })
      }
    >
      <ScanLine className={cn("size-4", pending && "animate-pulse")} />
      {pending ? t("scanning") : t("scanAll")}
    </Button>
  );
}
