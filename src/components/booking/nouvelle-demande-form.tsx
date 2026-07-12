"use client";

import { Check, Loader2, Send, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createDemandeBookingAction, type ActionResult } from "@/lib/booking/actions";
import type { ClientOption } from "@/lib/booking/service";

const FIELD =
  "border-border bg-background focus-visible:ring-ring/50 h-10 w-full rounded-[var(--radius)] border px-3 text-sm outline-none focus-visible:ring-[3px]";
const LABEL = "text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase";

export function NouvelleDemandeForm({ clients }: { clients: ClientOption[] }) {
  const t = useTranslations("booking.form");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          const res = await createDemandeBookingAction(fd);
          setResult(res);
          if (res.ok) {
            formRef.current?.reset();
            router.refresh();
          }
        })
      }
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="clientId" className={LABEL}>
          {t("client")}
        </label>
        <select id="clientId" name="clientId" required className={FIELD}>
          <option value="">{t("clientPlaceholder")}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="produit" className={LABEL}>
          {t("produit")}
        </label>
        <input id="produit" name="produit" required className={FIELD} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="variete" className={LABEL}>
          {t("variete")}
        </label>
        <input id="variete" name="variete" className={FIELD} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quantite" className={LABEL}>
            {t("quantite")}
          </label>
          <input
            id="quantite"
            name="quantite"
            type="number"
            step="any"
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="unite" className={LABEL}>
            {t("unite")}
          </label>
          <input id="unite" name="unite" placeholder="t / cartons" className={FIELD} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="incoterm" className={LABEL}>
          {t("incoterm")}
        </label>
        <input
          id="incoterm"
          name="incoterm"
          placeholder="DAP / FOB / FCA…"
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="mode" className={LABEL}>
          {t("mode")}
        </label>
        <select id="mode" name="mode" defaultValue="sea" className={FIELD}>
          <option value="sea">{t("modeSea")}</option>
          <option value="roro">{t("modeRoro")}</option>
          <option value="air">{t("modeAir")}</option>
          <option value="road">{t("modeRoad")}</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="destinationPays" className={LABEL}>
            {t("destinationPays")}
          </label>
          <input id="destinationPays" name="destinationPays" className={FIELD} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="destinationPort" className={LABEL}>
            {t("destinationPort")}
          </label>
          <input id="destinationPort" name="destinationPort" className={FIELD} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dateSouhaitee" className={LABEL}>
          {t("dateSouhaitee")}
        </label>
        <input id="dateSouhaitee" name="dateSouhaitee" type="date" className={FIELD} />
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
        {result?.ok && (
          <p className="text-primary inline-flex items-center gap-1.5 text-sm">
            <Check className="size-4" />
            {t("dossierCree")}
          </p>
        )}
      </div>
    </form>
  );
}
