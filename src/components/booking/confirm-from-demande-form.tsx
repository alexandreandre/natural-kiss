"use client";

import { Check, Ship, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmationFields } from "@/components/booking/confirmation-fields";
import { Button } from "@/components/ui/button";
import {
  confirmBookingAction,
  type ConfirmBookingActionResult,
} from "@/lib/booking/actions";

/** Confirmation d'un dossier existant : client/produit/mode déjà connus, 3 champs suffisent. */
export function ConfirmFromDemandeForm({ demandeId }: { demandeId: string }) {
  const t = useTranslations("booking.confirm");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ConfirmBookingActionResult | null>(null);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          fd.set("demandeId", demandeId);
          const res = await confirmBookingAction(fd);
          setResult(res);
          if (res.ok) router.refresh();
        })
      }
      className="flex flex-col gap-4"
    >
      <ConfirmationFields />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || (result?.ok ?? false)}>
          <Ship className="size-4" />
          {t("submit")}
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
            {t("lotCree", { reference: result.lotReference })}
          </Link>
        )}
      </div>
    </form>
  );
}
