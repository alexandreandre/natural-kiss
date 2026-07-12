"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { runGateCheckAction } from "@/lib/gate/actions";
import { cn } from "@/lib/utils";

export function GateRunButton({ lotId }: { lotId: string }) {
  const t = useTranslations("gate");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await runGateCheckAction(lotId);
          router.refresh();
        })
      }
    >
      <ShieldCheck className={cn("size-4", pending && "animate-pulse")} />
      {pending ? t("running") : t("run")}
    </Button>
  );
}
