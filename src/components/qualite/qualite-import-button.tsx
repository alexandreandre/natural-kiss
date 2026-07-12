"use client";

import { Check, Download, Loader2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { importEmailQCAction } from "@/lib/qualite/actions";
import { cn } from "@/lib/utils";

type Feedback = {
  statut: "rattache" | "non_rattache" | "erreur";
  message?: string;
} | null;

export function QualiteImportButton({
  emailId,
  imported,
}: {
  emailId: string;
  imported: boolean;
}) {
  const t = useTranslations("qualite.inbox");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        size="sm"
        variant={imported && !feedback ? "outline" : "default"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await importEmailQCAction(emailId);
            setFeedback({ statut: res.statut, message: res.message });
            router.refresh();
          })
        }
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {imported ? t("reimport") : t("import")}
      </Button>
      {feedback && (
        <p
          className={cn(
            "inline-flex items-center gap-1.5 text-right text-[11px]",
            feedback.statut === "rattache" ? "text-primary" : "text-destructive",
          )}
        >
          {feedback.statut === "rattache" ? (
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
