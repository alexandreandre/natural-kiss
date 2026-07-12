"use client";

import { CheckCircle2, Loader2, Send, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { submitPublicDemandeAction } from "@/lib/onboarding/actions";

const FIELD =
  "border-border bg-background focus-visible:ring-ring/50 h-10 w-full rounded-[var(--radius)] border px-3 text-sm outline-none focus-visible:ring-[3px]";
const LABEL = "text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase";

export function PublicDemandeForm() {
  const t = useTranslations("nouvelleDemande");
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="border-primary/25 bg-primary/5 rounded-[var(--radius)] border p-6 text-center">
        <CheckCircle2 className="text-primary mx-auto size-8" />
        <h2 className="font-display mt-3 text-lg font-medium">
          {t("confirmationTitle")}
        </h2>
        <p className="text-muted-foreground mt-1.5 text-sm">{t("confirmationBody")}</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          const res = await submitPublicDemandeAction(fd);
          if (res.ok) setDone(true);
          else setError(res.error ?? null);
        })
      }
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="clientNom" className={LABEL}>{t("form.company")}</label>
        <input id="clientNom" name="clientNom" required className={FIELD} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="contactEmail" className={LABEL}>{t("form.email")}</label>
        <input id="contactEmail" name="contactEmail" type="email" className={FIELD} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="produit" className={LABEL}>{t("form.produit")}</label>
        <input id="produit" name="produit" required list="produit-suggestions"
          placeholder={t("form.produitPlaceholder")} className={FIELD} />
        <datalist id="produit-suggestions">
          <option value="Mangue" />
          <option value="Brocoli / Tenderstem" />
          <option value="Patate douce" />
          <option value="Ail" />
          <option value="Fraise" />
        </datalist>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pays" className={LABEL}>{t("form.pays")}</label>
        <input id="pays" name="pays" required list="pays-suggestions"
          placeholder={t("form.paysPlaceholder")} className={FIELD} />
        <datalist id="pays-suggestions">
          <option value="UK" />
          <option value="FR" />
          <option value="NL" />
          <option value="RU" />
        </datalist>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="volume" className={LABEL}>{t("form.volume")}</label>
        <input id="volume" name="volume" className={FIELD} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {t("form.submit")}
        </Button>
        {error && (
          <p className="text-destructive inline-flex items-center gap-1.5 text-sm">
            <TriangleAlert className="size-4" />
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
