"use client";

import { BellRing, ScanLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { AlerteSeverityBadge } from "@/components/alertes/alerte-severity-badge";
import { Button } from "@/components/ui/button";
import { runAlertScanAction } from "@/lib/alertes/actions";
import type { AlerteOverviewRow } from "@/lib/alertes/service";
import { cn } from "@/lib/utils";

export function AlertesPanel({ lotId, alertes }: { lotId: string; alertes: AlerteOverviewRow[] }) {
  const t = useTranslations("alertes");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const active = alertes.filter((a) => a.statut === "active");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground/70 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
          <BellRing className="size-3.5" />
          {t("lotTitle")}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await runAlertScanAction(lotId);
              router.refresh();
            })
          }
        >
          <ScanLine className={cn("size-3.5", pending && "animate-pulse")} />
          {pending ? t("scanning") : t("scan")}
        </Button>
      </div>

      {active.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-8 text-center text-sm">
          {t("none")}
        </p>
      ) : (
        <ul className="divide-border/60 border-border divide-y rounded-[4px] border">
          {active.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t(`type.${a.type}`)}</p>
                <p className="text-muted-foreground/80 mt-0.5 text-xs">{a.message}</p>
              </div>
              <AlerteSeverityBadge severite={a.severite} label={t(`severite.${a.severite}`)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
