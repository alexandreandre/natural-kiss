import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isModuleEnabled, type ModuleDef } from "@/lib/modules";

export function ModuleCard({ module }: { module: ModuleDef }) {
  const t = useTranslations("module");
  const enabled = isModuleEnabled(module);
  const Icon = module.icon;

  return (
    <Card
      className={cn(
        "relative gap-0 transition-colors",
        enabled ? "border-primary/30 bg-card" : "bg-muted/30 border-dashed opacity-80",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div
          className={cn(
            "grid size-10 place-items-center rounded-lg",
            enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-muted-foreground font-mono text-[10px]">
            {module.id}
          </span>
          <Badge variant={enabled ? "default" : "secondary"} className="text-[10px]">
            {enabled ? t("status.active") : t("status.soon")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <h3 className="text-sm font-semibold">{t(`${module.key}.title`)}</h3>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {t(`${module.key}.desc`)}
        </p>
        <p className="text-muted-foreground/80 mt-3 text-[11px] font-medium">
          {t("brique", { n: module.brique })}
        </p>
      </CardContent>
    </Card>
  );
}
