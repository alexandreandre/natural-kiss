"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { LotFilterOptions } from "@/lib/data/lots";
import type { RiskBand } from "@/lib/tracking/risk";

const SELECT_CLASS =
  "border-border bg-card text-foreground focus-visible:border-primary focus-visible:ring-primary/30 h-9 rounded-[4px] border pr-8 pl-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none";

const RISK_BANDS: RiskBand[] = ["faible", "moyen", "eleve"];

function Field({
  name,
  label,
  value,
  children,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  children: React.ReactNode;
  onChange: (name: string, value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.12em] uppercase">
        {label}
      </span>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className={SELECT_CLASS}
      >
        {children}
      </select>
    </label>
  );
}

export function DashboardFilters({ options }: { options: LotFilterOptions }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = {
    client: searchParams.get("client") ?? "",
    produit: searchParams.get("produit") ?? "",
    pays: searchParams.get("pays") ?? "",
    risque: searchParams.get("risque") ?? "",
  };
  const hasFilters = Object.values(current).some(Boolean);

  const update = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field
        name="client"
        label={t("dashboard.filters.client")}
        value={current.client}
        onChange={update}
      >
        <option value="">{t("dashboard.filters.all")}</option>
        {options.clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nom}
          </option>
        ))}
      </Field>

      <Field
        name="produit"
        label={t("dashboard.filters.product")}
        value={current.produit}
        onChange={update}
      >
        <option value="">{t("dashboard.filters.all")}</option>
        {options.produits.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Field>

      <Field
        name="pays"
        label={t("dashboard.filters.country")}
        value={current.pays}
        onChange={update}
      >
        <option value="">{t("dashboard.filters.all")}</option>
        {options.pays.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Field>

      <Field
        name="risque"
        label={t("dashboard.filters.risk")}
        value={current.risque}
        onChange={update}
      >
        <option value="">{t("dashboard.filters.all")}</option>
        {RISK_BANDS.map((b) => (
          <option key={b} value={b}>
            {t(`tracking.risk.band.${b}`)}
          </option>
        ))}
      </Field>

      {hasFilters && (
        <Link
          href={pathname}
          className="text-muted-foreground hover:text-foreground inline-flex h-9 items-center gap-1.5 text-xs transition-colors"
        >
          <X className="size-3.5" />
          {t("dashboard.reset")}
        </Link>
      )}
    </div>
  );
}
