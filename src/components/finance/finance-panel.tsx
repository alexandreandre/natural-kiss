"use client";

import { AlertTriangle, FileWarning, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  FactureCoherenceBadge,
  PaiementStatusBadge,
} from "@/components/finance/finance-status-badge";
import {
  createLitigeAction,
  issueCertificatDestructionAction,
  updateLitigeStatutAction,
  upsertPaiementAction,
} from "@/lib/finance/actions";
import type { LotFinanceData } from "@/lib/finance/service";
import { cn } from "@/lib/utils";

const FIELD =
  "border-border bg-background focus-visible:ring-ring/50 h-9 w-full rounded-[var(--radius)] border px-3 text-sm outline-none focus-visible:ring-[3px]";
const LABEL = "text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase";

const PAIEMENT_STATUTS = ["a_venir", "en_attente", "partiel", "paye", "litige"] as const;
const LITIGE_TYPES = [
  "facture_contestee",
  "sous_evaluation_douaniere",
  "qualite",
  "autre",
] as const;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground/70 mb-3 font-mono text-[10px] tracking-[0.14em] uppercase">
      {children}
    </h3>
  );
}

export function FinancePanel({ lotId, data }: { lotId: string; data: LotFinanceData }) {
  const t = useTranslations("finance");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [statut, setStatut] = useState(data.paiement.statut);
  const [montant, setMontant] = useState(data.paiement.montant?.toString() ?? "");
  const [echeance, setEcheance] = useState(data.paiement.echeance ?? "");

  const [litigeOpen, setLitigeOpen] = useState(false);
  const [litigeType, setLitigeType] = useState<(typeof LITIGE_TYPES)[number]>("facture_contestee");
  const [litigeDesc, setLitigeDesc] = useState("");
  const [litigeMontant, setLitigeMontant] = useState("");

  return (
    <div className="space-y-7">
      {/* ── Statut de paiement ─────────────────────────────────────── */}
      <div className="border-border rounded-[4px] border p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground/70 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
              <Wallet className="size-3.5" />
              {t("payment.title")}
            </p>
            <div className="mt-3">
              <PaiementStatusBadge statut={data.paiement.statut} label={t(`payment.status.${data.paiement.statut}`)} />
            </div>
          </div>
          <FactureCoherenceBadge
            coherence={data.factureCoherence}
            label={t(`invoiceCoherence.${data.factureCoherence}`)}
          />
        </div>

        <form
          className="mt-5 grid gap-4 sm:grid-cols-3"
          action={() =>
            startTransition(async () => {
              await upsertPaiementAction(lotId, {
                statut,
                montant: montant ? Number(montant) : null,
                echeance: echeance || null,
              });
              router.refresh();
            })
          }
        >
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>{t("payment.status.label")}</label>
            <select
              className={FIELD}
              value={statut}
              onChange={(e) => setStatut(e.target.value as typeof statut)}
            >
              {PAIEMENT_STATUTS.map((s) => (
                <option key={s} value={s}>
                  {t(`payment.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>{t("payment.amount")}</label>
            <input
              className={FIELD}
              type="number"
              min={0}
              step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>{t("payment.dueDate")}</label>
            <input
              className={FIELD}
              type="date"
              value={echeance}
              onChange={(e) => setEcheance(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </div>

      {/* ── Litiges ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between">
          <SectionTitle>{t("litiges.title")}</SectionTitle>
          <Button variant="outline" size="sm" onClick={() => setLitigeOpen((o) => !o)}>
            {t("litiges.open")}
          </Button>
        </div>

        {litigeOpen && (
          <form
            className="border-border bg-muted/20 mb-4 grid gap-4 rounded-[4px] border p-4 sm:grid-cols-2"
            action={() =>
              startTransition(async () => {
                if (!litigeDesc.trim()) return;
                await createLitigeAction(lotId, {
                  type: litigeType,
                  description: litigeDesc.trim(),
                  montantConteste: litigeMontant ? Number(litigeMontant) : null,
                });
                setLitigeDesc("");
                setLitigeMontant("");
                setLitigeOpen(false);
                router.refresh();
              })
            }
          >
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("litiges.type")}</label>
              <select
                className={FIELD}
                value={litigeType}
                onChange={(e) => setLitigeType(e.target.value as typeof litigeType)}
              >
                {LITIGE_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {t(`litiges.types.${ty}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>{t("litiges.amount")}</label>
              <input
                className={FIELD}
                type="number"
                min={0}
                step="0.01"
                value={litigeMontant}
                onChange={(e) => setLitigeMontant(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={LABEL}>{t("litiges.description")}</label>
              <textarea
                className={cn(FIELD, "h-20 resize-none py-2")}
                value={litigeDesc}
                onChange={(e) => setLitigeDesc(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? t("saving") : t("litiges.submit")}
              </Button>
            </div>
          </form>
        )}

        {data.litiges.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-6 text-center text-sm">
            {t("litiges.empty")}
          </p>
        ) : (
          <ul className="divide-border/60 border-border divide-y rounded-[4px] border">
            {data.litiges.map((l) => (
              <li key={l.id} className="flex flex-col gap-2 px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive size-4 shrink-0" />
                    <p className="text-sm font-medium">{t(`litiges.types.${l.type}`)}</p>
                    <span className="text-muted-foreground/70 font-mono text-[11px]">
                      {t(`litiges.statut.${l.statut}`)}
                    </span>
                  </div>
                  {(l.statut === "ouvert" || l.statut === "en_cours") && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await updateLitigeStatutAction(lotId, l.id, "resolu", t("litiges.resolvedNote"));
                          router.refresh();
                        })
                      }
                    >
                      {t("litiges.resolve")}
                    </Button>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{l.description}</p>
                {l.montantConteste !== null && (
                  <p className="text-muted-foreground/70 font-mono text-[11px]">
                    {t("litiges.amount")} : {l.montantConteste} {l.devise}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Certificat de destruction ──────────────────────────────── */}
      <div>
        <SectionTitle>{t("destruction.title")}</SectionTitle>
        {data.certificatsDestruction.length === 0 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await issueCertificatDestructionAction(lotId, {
                  motif: t("destruction.defaultMotif"),
                });
                router.refresh();
              })
            }
          >
            <FileWarning className="size-3.5" />
            {t("destruction.issue")}
          </Button>
        ) : (
          <ul className="divide-border/60 border-border divide-y rounded-[4px] border">
            {data.certificatsDestruction.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.motif}</p>
                  <p className="text-muted-foreground/70 font-mono text-[11px]">
                    {c.emisLe}
                    {c.quantite ? ` · ${c.quantite} ${c.unite ?? ""}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
