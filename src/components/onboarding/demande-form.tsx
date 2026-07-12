"use client";

import { Check, Loader2, Send, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  createDemandeAction,
  type CreateDemandeActionResult,
} from "@/lib/onboarding/actions";
import { cn } from "@/lib/utils";

const FIELD =
  "border-border bg-background focus-visible:ring-ring/50 h-10 w-full rounded-[var(--radius)] border px-3 text-sm outline-none focus-visible:ring-[3px]";
const LABEL = "text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase";

export function DemandeForm() {
  const t = useTranslations("demande.form");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateDemandeActionResult | null>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          const res = await createDemandeAction(fd);
          setResult(res);
          if (res.ok) {
            formRef.current?.reset();
            router.refresh();
          }
        })
      }
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="clientNom" className={LABEL}>
          {t("client")}
        </label>
        <input id="clientNom" name="clientNom" required className={FIELD} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="produit" className={LABEL}>
          {t("produit")}
        </label>
        <input
          id="produit"
          name="produit"
          required
          list="produit-suggestions"
          placeholder={t("produitPlaceholder")}
          className={FIELD}
        />
        <datalist id="produit-suggestions">
          <option value="Mangue" />
          <option value="Brocoli / Tenderstem" />
          <option value="Patate douce" />
          <option value="Ail" />
          <option value="Fraise" />
        </datalist>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pays" className={LABEL}>
          {t("pays")}
        </label>
        <input
          id="pays"
          name="pays"
          required
          list="pays-suggestions"
          placeholder={t("paysPlaceholder")}
          className={FIELD}
        />
        <datalist id="pays-suggestions">
          <option value="UK" />
          <option value="FR" />
          <option value="NL" />
          <option value="RU" />
        </datalist>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contactEmail" className={LABEL}>
          {t("email")}
        </label>
        <input id="contactEmail" name="contactEmail" type="email" className={FIELD} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="volume" className={LABEL}>
          {t("volume")}
        </label>
        <input id="volume" name="volume" className={FIELD} />
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {t("submit")}
        </Button>

        {result && !result.ok && (
          <p className="text-destructive inline-flex items-center gap-1.5 text-sm">
            <TriangleAlert className="size-4" />
            {result.error}
          </p>
        )}
      </div>

      {result?.ok && (
        <div
          className={cn(
            "rounded-[var(--radius)] border p-4 text-sm sm:col-span-2",
            result.decision === "suffisant"
              ? "border-primary/25 bg-primary/5"
              : "border-destructive/25 bg-destructive/5",
          )}
        >
          <p className="flex items-center gap-2 font-medium">
            {result.decision === "suffisant" ? (
              <Check className="text-primary size-4" />
            ) : (
              <TriangleAlert className="text-destructive size-4" />
            )}
            {result.decision === "suffisant"
              ? t("resultSuffisant")
              : t("resultInsuffisant")}
          </p>
          <p className="text-muted-foreground mt-1.5">{result.raison}</p>
          {result.decision === "suffisant" && result.mailSent && (
            <p className="text-primary mt-1.5 text-xs">{t("mailSent")}</p>
          )}
          {result.decision === "insuffisant" && (result.tachesCreees ?? 0) > 0 && (
            <p className="text-destructive mt-1.5 text-xs">
              {t("tachesCreees", { n: result.tachesCreees ?? 0 })}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
