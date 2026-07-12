import { ArrowLeft, SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  DocumentsSection,
  OriginSection,
  QualitySection,
} from "@/components/lots/lot-sections";
import { AlertesPanel } from "@/components/alertes/alertes-panel";
import { ChargementPanel } from "@/components/chargement/chargement-panel";
import { FinancePanel } from "@/components/finance/finance-panel";
import { GatePanel } from "@/components/gate/gate-panel";
import { LotTabs, type LotTab } from "@/components/lots/lot-tabs";
import { LotHeader } from "@/components/tracking/lot-header";
import { TrackingVoyage } from "@/components/tracking/tracking-voyage";
import { getLotAlertes } from "@/lib/alertes/service";
import { getPreuves } from "@/lib/chargement/service";
import { getLotById, getLotDetailSections } from "@/lib/data/lots";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getLotFinance } from "@/lib/finance/service";
import { getGateData } from "@/lib/gate/service";
import { getLotQcComparison } from "@/lib/qualite/service";
import { resolveTracking } from "@/lib/tracking/service";

export const dynamic = "force-dynamic";

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href="/lots"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
    >
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  );
}

export default async function LotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isFeatureEnabled("LOTS")) notFound();

  const t = await getTranslations();
  const { id } = await params;

  const lot = await getLotById(id);

  if (!lot) {
    return (
      <div>
        <BackLink label={t("lots.backToList")} />
        <div className="border-border mt-10 flex flex-col items-center gap-3 rounded-[4px] border border-dashed p-10 text-center">
          <SearchX className="text-muted-foreground/60 size-8" />
          <div>
            <p className="font-medium">{t("lots.notFound")}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("lots.notFoundBody")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const gateEnabled = isFeatureEnabled("GATE");
  const chargementEnabled = isFeatureEnabled("PORTAIL");
  const qualiteEnabled = isFeatureEnabled("EMAIL_HUB");
  const completudeEnabled = isFeatureEnabled("COMPLETUDE");
  const trackingRef = lot.numeroConteneur ?? lot.reference;
  const [sections, tracking, gate, preuves, qcComparison, finance, alertes] =
    await Promise.all([
      getLotDetailSections(lot.id),
      resolveTracking(trackingRef),
      gateEnabled ? getGateData(lot.id) : Promise.resolve(null),
      chargementEnabled ? getPreuves(lot.id) : Promise.resolve(null),
      qualiteEnabled ? getLotQcComparison(lot.id) : Promise.resolve(null),
      completudeEnabled ? getLotFinance(lot.id) : Promise.resolve(null),
      completudeEnabled ? getLotAlertes(lot.id) : Promise.resolve(null),
    ]);

  const tabs: LotTab[] = [
    {
      id: "voyage",
      label: t("lots.tabs.voyage"),
      content: tracking ? (
        <TrackingVoyage result={tracking} />
      ) : (
        <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-10 text-center text-sm">
          {t("lots.noTracking")}
        </p>
      ),
    },
    ...(gateEnabled && gate
      ? [
          {
            id: "gate",
            label: t("lots.tabs.gate"),
            content: <GatePanel lotId={lot.id} data={gate} />,
          },
        ]
      : []),
    ...(chargementEnabled && preuves
      ? [
          {
            id: "chargement",
            label: t("lots.tabs.chargement"),
            content: <ChargementPanel lotId={lot.id} preuves={preuves} />,
          },
        ]
      : []),
    {
      id: "documents",
      label: t("lots.tabs.documents"),
      content: <DocumentsSection documents={sections.documents} />,
    },
    {
      id: "quality",
      label: t("lots.tabs.quality"),
      content: <QualitySection reports={sections.qualite} comparison={qcComparison} />,
    },
    {
      id: "origin",
      label: t("lots.tabs.origin"),
      content: <OriginSection lotId={lot.id} origines={sections.origines} />,
    },
    ...(completudeEnabled && finance
      ? [
          {
            id: "finance",
            label: t("lots.tabs.finance"),
            content: <FinancePanel lotId={lot.id} data={finance} />,
          },
        ]
      : []),
    ...(completudeEnabled && alertes
      ? [
          {
            id: "alertes",
            label: t("lots.tabs.alertes"),
            content: <AlertesPanel lotId={lot.id} alertes={alertes} />,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <BackLink label={t("lots.backToList")} />
      <LotHeader lot={lot} trackingRef={trackingRef} />
      <LotTabs tabs={tabs} />
    </div>
  );
}
