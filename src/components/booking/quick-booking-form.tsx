"use client";

import { Check, Ship, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { ConfirmationFields } from "@/components/booking/confirmation-fields";
import { Button } from "@/components/ui/button";
import {
  confirmBookingAction,
  type ConfirmBookingActionResult,
} from "@/lib/booking/actions";
import type { ClientOption } from "@/lib/booking/service";

const FIELD =
  "border-border bg-background focus-visible:ring-ring/50 h-10 w-full rounded-[var(--radius)] border px-3 text-sm outline-none focus-visible:ring-[3px]";
const LABEL = "text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase";

/**
 * Réservation directe, sans dossier préalable — pour le cas où le canal de
 * booking n'est pas passé par un dossier généré ici (appel téléphonique
 * traité ailleurs, portail transporteur, etc.). Même geste final que la
 * confirmation d'un dossier : les 3 champs de `ConfirmationFields` créent le lot.
 */
export function QuickBookingForm({ clients }: { clients: ClientOption[] }) {
  const t = useTranslations("booking.quick");
  const tConfirm = useTranslations("booking.confirm");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ConfirmBookingActionResult | null>(null);

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          const res = await confirmBookingAction(fd);
          setResult(res);
          if (res.ok) {
            formRef.current?.reset();
            router.refresh();
          }
        })
      }
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quick-clientId" className={LABEL}>
            {t("client")}
          </label>
          <select id="quick-clientId" name="clientId" required className={FIELD}>
            <option value="">{t("clientPlaceholder")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quick-produit" className={LABEL}>
            {t("produit")}
          </label>
          <input id="quick-produit" name="produit" required className={FIELD} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quick-mode" className={LABEL}>
            {t("mode")}
          </label>
          <select id="quick-mode" name="mode" defaultValue="sea" className={FIELD}>
            <option value="sea">{t("modeSea")}</option>
            <option value="roro">{t("modeRoro")}</option>
            <option value="air">{t("modeAir")}</option>
            <option value="road">{t("modeRoad")}</option>
          </select>
        </div>
      </div>

      <ConfirmationFields />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          <Ship className="size-4" />
          {tConfirm("submit")}
        </Button>
        {result && !result.ok && (
          <p className="text-destructive inline-flex items-center gap-1.5 text-sm">
            <TriangleAlert className="size-4" />
            {result.error}
          </p>
        )}
        {result?.ok && result.lotId && result.lotReference && (
          <Link
            href={`/lots/${result.lotId}`}
            className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            <Check className="size-4" />
            {tConfirm("lotCree", { reference: result.lotReference })}
          </Link>
        )}
      </div>
    </form>
  );
}
