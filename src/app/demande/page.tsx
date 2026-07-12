import { BellRing, Mail, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { DecisionBadge } from "@/components/onboarding/decision-badge";
import { DemandeForm } from "@/components/onboarding/demande-form";
import { OnboardButton } from "@/components/onboarding/onboard-button";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getOnboardingOverview } from "@/lib/onboarding/service";
import { cn } from "@/lib/utils";

// Décision + coffre lus en base → toujours frais.
export const dynamic = "force-dynamic";

const CERTIF_STATUT_TONE = {
  valide: "text-primary",
  suspendue: "text-harvest",
  expiree: "text-destructive",
} as const;

export default async function DemandePage() {
  if (!isFeatureEnabled("ONBOARDING")) notFound();

  const t = await getTranslations();
  const { demandes, coffre, alertes, emails } = await getOnboardingOverview();

  return (
    <div className="flex flex-col gap-10">
      {/* ── Masthead ─────────────────────────────────────────────────── */}
      <section>
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("demande.kicker")}
        </p>
        <h1 className="font-display mt-4 max-w-[22ch] text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-4xl">
          {t("demande.title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[62ch] text-sm leading-relaxed">
          {t("demande.subtitle")}
        </p>
      </section>

      {/* ── Alertes d'expiration certifs ─────────────────────────────── */}
      {alertes.length > 0 && (
        <section className="border-harvest/40 bg-harvest/10 rounded-[var(--radius)] border p-4">
          <p className="text-harvest flex items-center gap-2 text-sm font-medium">
            <BellRing className="size-4" />
            {t("demande.coffre.alertesTitle")}
          </p>
          <ul className="mt-2 space-y-1">
            {alertes.map((a) => (
              <li key={a.type} className="text-foreground/80 text-sm">
                {t(`certif.${a.type}`)} —{" "}
                {a.expiree
                  ? t("demande.coffre.expiree", { date: a.dateExpiration })
                  : t("demande.coffre.expireDans", {
                      jours: a.joursRestants,
                      date: a.dateExpiration,
                    })}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Nouvelle demande ─────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xl font-medium tracking-tight">
          {t("demande.form.title")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("demande.form.hint")}</p>
        <div className="mt-4">
          <DemandeForm />
        </div>
      </section>

      {/* ── Demandes reçues ──────────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xl font-medium tracking-tight">
          {t("demande.list.title")}
        </h2>
        {demandes.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            {t("demande.list.empty")}
          </p>
        ) : (
          <ul className="divide-border/60 border-border mt-4 divide-y rounded-[4px] border">
            {demandes.map((d) => (
              <li key={d.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {d.clientNom}
                    </p>
                    <p className="text-muted-foreground/80 mt-0.5 text-xs">
                      {d.produit} · {d.pays}
                      {d.volume ? ` · ${d.volume}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <DecisionBadge
                      decision={d.decision === "en_attente" ? "en_attente" : d.decision}
                      label={t(`demande.decision.${d.decision}`)}
                    />
                    {d.decision === "suffisant" && (
                      <OnboardButton
                        demandeId={d.id}
                        espaceClientCree={d.espaceClientCree}
                      />
                    )}
                  </div>
                </div>

                {d.raison && (
                  <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                    {d.raison}
                  </p>
                )}

                {d.decision === "suffisant" && d.packEnvoyeLe && (
                  <p className="text-primary mt-1.5 text-xs">
                    {t("demande.list.packEnvoye")}
                  </p>
                )}

                {d.taches.length > 0 && (
                  <div className="border-border/60 mt-3 border-t pt-3">
                    <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
                      {t("demande.list.taches")}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {d.taches.map((tache) => (
                        <li
                          key={tache.id}
                          className="text-foreground/80 flex items-center gap-2 text-xs"
                        >
                          <span className="bg-destructive/70 inline-block size-1.5 rounded-full" />
                          {tache.libelle}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Coffre certifications (M0c) ──────────────────────────────── */}
      <section>
        <h2 className="font-display flex items-center gap-2 text-xl font-medium tracking-tight">
          <ShieldCheck className="text-primary size-5" />
          {t("demande.coffre.title")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("demande.coffre.subtitle")}
        </p>
        <ul className="divide-border/60 border-border mt-4 divide-y rounded-[4px] border">
          {coffre.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {c.label}
                  {c.organisme ? (
                    <span className="text-muted-foreground/70 font-normal">
                      {" "}
                      · {c.organisme}
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground/80 mt-0.5 text-xs">
                  {c.produits.length > 0
                    ? c.produits.join(", ")
                    : t("demande.coffre.aucunProduit")}
                  {" · "}
                  {c.pays.join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {c.dateExpiration && (
                  <span
                    className={cn(
                      "tabular-nums",
                      c.alerte ? "text-harvest font-medium" : "text-muted-foreground",
                    )}
                  >
                    {t("demande.coffre.valableJusqu", { date: c.dateExpiration })}
                  </span>
                )}
                <span className={cn("font-medium", CERTIF_STATUT_TONE[c.statut])}>
                  {t(`demande.coffre.statut.${c.statut}`)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Emails envoyés (démo) ────────────────────────────────────── */}
      <section>
        <h2 className="font-display flex items-center gap-2 text-xl font-medium tracking-tight">
          <Mail className="text-primary size-5" />
          {t("demande.outbox.title")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("demande.outbox.subtitle")}
        </p>
        {emails.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            {t("demande.outbox.empty")}
          </p>
        ) : (
          <ul className="divide-border/60 border-border mt-4 divide-y rounded-[4px] border">
            {emails.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="border-primary/25 bg-primary/5 text-primary rounded-[3px] border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase">
                  {t(`demande.outbox.categorie.${e.categorie}`)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{e.subject}</span>
                <span className="text-muted-foreground/70 truncate font-mono text-[11px]">
                  {e.toEmail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
