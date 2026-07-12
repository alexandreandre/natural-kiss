"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { parseConfirmationEmailAction } from "@/lib/booking/actions";

const FIELD =
  "border-border bg-background focus-visible:ring-ring/50 h-10 w-full rounded-[var(--radius)] border px-3 text-sm outline-none focus-visible:ring-[3px]";
const LABEL = "text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase";

/**
 * Les 3 champs du point d'entrée unique de confirmation — n° conteneur,
 * transporteur, date de départ — pré-remplissables en collant le texte d'un
 * mail de confirmation (IA), quel que soit l'expéditeur (transporteur direct,
 * broker, transitaire). La saisie manuelle reste toujours possible et prioritaire.
 */
export function ConfirmationFields() {
  const t = useTranslations("booking.confirm");
  const [pending, startTransition] = useTransition();
  const [emailText, setEmailText] = useState("");
  const [numeroConteneur, setNumeroConteneur] = useState("");
  const [transporteurNom, setTransporteurNom] = useState("");
  const [dateDepart, setDateDepart] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function analyser() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("emailText", emailText);
      const res = await parseConfirmationEmailAction(fd);
      if (!res.ok || !res.extract) {
        setNotice(res.error ?? t("parseError"));
        return;
      }
      if (res.extract.numeroConteneur) setNumeroConteneur(res.extract.numeroConteneur);
      if (res.extract.transporteurNom) setTransporteurNom(res.extract.transporteurNom);
      if (res.extract.dateDepart) setDateDepart(res.extract.dateDepart);
      setNotice(t("parseDone"));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border/70 bg-muted/30 rounded-[var(--radius)] border border-dashed p-3">
        <label htmlFor="emailText" className={LABEL}>
          {t("pasteEmail")}
        </label>
        <textarea
          id="emailText"
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          rows={3}
          placeholder={t("pasteEmailPlaceholder")}
          className="border-border bg-background mt-1.5 w-full rounded-[var(--radius)] border p-2 text-sm outline-none"
        />
        <div className="mt-2 flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || !emailText.trim()}
            onClick={analyser}
          >
            <Sparkles className="size-3.5" />
            {t("analyser")}
          </Button>
          {notice && <p className="text-muted-foreground text-xs">{notice}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="numeroConteneur" className={LABEL}>
            {t("numeroConteneur")}
          </label>
          <input
            id="numeroConteneur"
            name="numeroConteneur"
            required
            value={numeroConteneur}
            onChange={(e) => setNumeroConteneur(e.target.value)}
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="transporteurNom" className={LABEL}>
            {t("transporteurNom")}
          </label>
          <input
            id="transporteurNom"
            name="transporteurNom"
            required
            value={transporteurNom}
            onChange={(e) => setTransporteurNom(e.target.value)}
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dateDepart" className={LABEL}>
            {t("dateDepart")}
          </label>
          <input
            id="dateDepart"
            name="dateDepart"
            type="date"
            required
            value={dateDepart}
            onChange={(e) => setDateDepart(e.target.value)}
            className={FIELD}
          />
        </div>
      </div>
    </div>
  );
}
