"use client";

import { ArrowUpRight, Check, ClipboardCopy, Ship } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmFromDemandeForm } from "@/components/booking/confirm-from-demande-form";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { Button } from "@/components/ui/button";
import { markDemandeEnvoyeeAction } from "@/lib/booking/actions";
import type { DemandeBookingRow } from "@/lib/booking/service";

function DemandeItem({ demande }: { demande: DemandeBookingRow }) {
  const t = useTranslations("booking.list");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  function copierDossier() {
    void navigator.clipboard.writeText(demande.dossierTexte).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function marquerEnvoye() {
    startTransition(async () => {
      await markDemandeEnvoyeeAction(demande.id);
      router.refresh();
    });
  }

  return (
    <li className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{demande.clientNom}</p>
          <p className="text-muted-foreground/80 mt-0.5 text-xs">
            {demande.produit}
            {demande.variete ? ` (${demande.variete})` : ""}
            {demande.destinationPays ? ` · ${demande.destinationPays}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {demande.lotId && demande.lotReference ? (
            <Link
              href={`/lots/${demande.lotId}`}
              className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              <span className="font-mono">{demande.lotReference}</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          ) : null}
          <BookingStatusBadge
            statut={demande.statut}
            label={t(`statut.${demande.statut}`)}
          />
        </div>
      </div>

      {demande.statut !== "confirme" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copierDossier}>
            <ClipboardCopy className="size-3.5" />
            {copied ? t("copie") : t("copierDossier")}
          </Button>
          {demande.statut === "brouillon" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={marquerEnvoye}
            >
              <Check className="size-3.5" />
              {t("marquerEnvoye")}
            </Button>
          )}
          <Button
            type="button"
            variant={expanded ? "secondary" : "default"}
            size="sm"
            onClick={() => setExpanded((v) => !v)}
          >
            <Ship className="size-3.5" />
            {expanded ? t("masquerConfirmation") : t("confirmer")}
          </Button>
        </div>
      )}

      {expanded && (
        <div className="border-border/60 bg-muted/20 mt-4 rounded-[var(--radius)] border p-4">
          <ConfirmFromDemandeForm demandeId={demande.id} />
        </div>
      )}
    </li>
  );
}

export function DemandesList({ demandes }: { demandes: DemandeBookingRow[] }) {
  const t = useTranslations("booking.list");

  if (demandes.length === 0) {
    return <p className="text-muted-foreground mt-3 text-sm">{t("empty")}</p>;
  }

  return (
    <ul className="divide-border/60 border-border mt-4 divide-y rounded-[4px] border">
      {demandes.map((d) => (
        <DemandeItem key={d.id} demande={d} />
      ))}
    </ul>
  );
}
