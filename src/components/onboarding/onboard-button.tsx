"use client";

import { Check, Loader2, TriangleAlert, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { onboardDemandeAction } from "@/lib/onboarding/actions";
import { cn } from "@/lib/utils";

export function OnboardButton({
  demandeId,
  espaceClientCree,
}: {
  demandeId: string;
  espaceClientCree: boolean;
}) {
  const t = useTranslations("demande.onboard");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  if (espaceClientCree && !feedback) {
    return (
      <span className="text-primary inline-flex items-center gap-1.5 text-xs font-medium">
        <Check className="size-3.5" />
        {t("done")}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await onboardDemandeAction(demandeId);
            setFeedback({
              ok: res.ok,
              message: res.ok
                ? t("created", { email: res.email ?? "" })
                : (res.error ?? ""),
            });
            if (res.ok) router.refresh();
          })
        }
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <UserPlus className="size-4" />
        )}
        {t("action")}
      </Button>
      {feedback && (
        <p
          className={cn(
            "inline-flex items-center gap-1.5 text-right text-[11px]",
            feedback.ok ? "text-primary" : "text-destructive",
          )}
        >
          {feedback.ok ? (
            <Check className="size-3" />
          ) : (
            <TriangleAlert className="size-3" />
          )}
          {feedback.message}
        </p>
      )}
    </div>
  );
}
