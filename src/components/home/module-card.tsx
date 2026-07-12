import { useTranslations } from "next-intl";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { isModuleEnabled, type ModuleDef } from "@/lib/modules";

export function ModuleCard({ module }: { module: ModuleDef }) {
  const t = useTranslations("module");
  const enabled = isModuleEnabled(module);
  const Icon = module.icon;
  const linkable = enabled && Boolean(module.href);

  const className = cn(
    "group relative flex min-h-40 flex-col p-4 transition-colors",
    enabled
      ? "bg-primary/[0.055] dark:bg-primary/[0.09]"
      : "bg-card hover:bg-accent/50",
    linkable && "hover:bg-primary/[0.09] dark:hover:bg-primary/[0.14]",
  );

  const inner = (
    <>
      {/* Filet d'accent à gauche pour le module en service. */}
      {enabled && <span className="bg-primary absolute inset-y-0 left-0 w-0.5" />}

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground/80 font-mono text-[11px] tracking-wide">
          {module.id}
        </span>
        <StatusTag
          enabled={enabled}
          label={enabled ? t("status.active") : t("status.soon")}
        />
      </div>

      <div className="mt-3 flex items-start gap-2.5">
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            enabled ? "text-primary" : "text-muted-foreground/60",
          )}
          strokeWidth={1.75}
        />
        <div>
          <h4
            className={cn(
              "text-sm leading-snug font-medium",
              !enabled && "text-foreground/80",
            )}
          >
            {t(`${module.key}.title`)}
          </h4>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {t(`${module.key}.desc`)}
          </p>
        </div>
      </div>

      <span className="text-muted-foreground/60 mt-auto pt-3 font-mono text-[10px] tracking-[0.08em] uppercase">
        {t("brique", { n: module.brique })}
      </span>
    </>
  );

  if (linkable && module.href) {
    return (
      <Link href={module.href} className={className}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

function StatusTag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wide",
        enabled ? "text-primary" : "text-muted-foreground/70",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          enabled ? "bg-primary" : "border-muted-foreground/50 border",
        )}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
