"use client";

import { Sprout } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { syncOriginAction } from "@/lib/origines/actions";
import { cn } from "@/lib/utils";

export function OriginSyncButton({ lotId }: { lotId: string }) {
  const t = useTranslations("lots.origin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await syncOriginAction(lotId);
          router.refresh();
        })
      }
    >
      <Sprout className={cn("size-3.5", pending && "animate-pulse")} />
      {pending ? t("syncing") : t("sync")}
    </Button>
  );
}
