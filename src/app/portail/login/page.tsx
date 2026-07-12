import { AlertCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { PortailLoginForm } from "@/components/portail/portail-login-form";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getPortailContext } from "@/lib/portail/session";

export const dynamic = "force-dynamic";

export default async function PortailLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isFeatureEnabled("PORTAIL")) redirect("/");

  // Déjà connecté → droit au portail.
  const ctx = await getPortailContext();
  if (ctx) redirect("/portail");

  const t = await getTranslations("portail.login");
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-md py-6">
      <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
        <span className="bg-harvest inline-block size-2 rounded-[1px]" />
        {t("kicker")}
      </p>
      <h1 className="font-display mt-4 text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
        {t("title")}
      </h1>
      <p className="text-muted-foreground mt-2 mb-6 text-sm leading-relaxed">
        {t("subtitle")}
      </p>

      {error && (
        <div className="text-destructive border-destructive/25 bg-destructive/[0.06] mb-4 flex items-start gap-2.5 rounded-[4px] border p-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{t("error")}</p>
        </div>
      )}

      <PortailLoginForm />
    </div>
  );
}
