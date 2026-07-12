import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { DemandesList } from "@/components/booking/demandes-list";
import { NouvelleDemandeForm } from "@/components/booking/nouvelle-demande-form";
import { QuickBookingForm } from "@/components/booking/quick-booking-form";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { listClientOptions, listDemandesBooking } from "@/lib/booking/service";

// Dossiers + statuts lus en base → toujours frais.
export const dynamic = "force-dynamic";

export default async function BookingPage() {
  if (!isFeatureEnabled("BOOKING")) notFound();

  const t = await getTranslations();
  const [demandes, clients] = await Promise.all([
    listDemandesBooking(),
    listClientOptions(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      {/* ── Masthead ─────────────────────────────────────────────────── */}
      <section>
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("booking.kicker")}
        </p>
        <h1 className="font-display mt-4 max-w-[24ch] text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-4xl">
          {t("booking.title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[64ch] text-sm leading-relaxed">
          {t("booking.subtitle")}
        </p>
      </section>

      {/* ── Nouvelle demande (dossier de réservation) ────────────────── */}
      <section>
        <h2 className="font-display text-xl font-medium tracking-tight">
          {t("booking.form.title")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("booking.form.hint")}</p>
        <div className="mt-4">
          <NouvelleDemandeForm clients={clients} />
        </div>
      </section>

      {/* ── Registre des dossiers ─────────────────────────────────────── */}
      <section>
        <h2 className="font-display text-xl font-medium tracking-tight">
          {t("booking.list.title")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("booking.list.hint")}</p>
        <DemandesList demandes={demandes} />
      </section>

      {/* ── Réservation directe (sans dossier préalable) ─────────────── */}
      <section>
        <h2 className="font-display text-xl font-medium tracking-tight">
          {t("booking.quick.title")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("booking.quick.hint")}</p>
        <div className="border-border/60 bg-muted/20 mt-4 rounded-[var(--radius)] border p-4">
          <QuickBookingForm clients={clients} />
        </div>
      </section>
    </div>
  );
}
