"use client";

import { AlertTriangle, CheckCircle2, Download, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  importPlanningAction,
  type ImportPlanningResult,
} from "@/lib/planning/actions";

export function PlanningImport() {
  const t = useTranslations("planning");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportPlanningResult | null>(null);

  return (
    <div className="border-border rounded-[4px] border border-dashed p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-[13px] font-medium tracking-wide">{t("import.title")}</h3>
        <p className="text-muted-foreground/80 text-xs leading-relaxed">
          {t("import.help")}
        </p>
      </div>

      <form
        ref={formRef}
        className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
        action={(formData) =>
          startTransition(async () => {
            const res = await importPlanningAction(formData);
            setResult(res);
            if (res.ok) {
              formRef.current?.reset();
              router.refresh();
            }
          })
        }
      >
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.12em] uppercase">
            {t("import.file")}
          </span>
          <input
            type="file"
            name="file"
            accept=".xlsx,.csv"
            required
            className="text-muted-foreground file:border-border file:bg-muted file:text-foreground text-sm file:mr-3 file:rounded-md file:border file:px-2 file:py-1 file:text-xs"
          />
        </label>

        <Button type="submit" variant="default" size="lg" disabled={pending}>
          <Upload className="size-4" />
          {pending ? t("import.uploading") : t("import.submit")}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a
          href="/exemples/planning-exemple.xlsx"
          download
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
        >
          <Download className="size-3.5" />
          {t("import.sample")}
        </a>
      </div>

      {result && (
        <div className="mt-3 text-xs">
          {result.ok ? (
            <p className="text-primary inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              {t("import.success", {
                inserted: result.inserted ?? 0,
                lots: result.matchedLots ?? 0,
              })}
            </p>
          ) : (
            <p className="text-destructive inline-flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              {result.error}
            </p>
          )}
          {result.warnings && result.warnings.length > 0 && (
            <ul className="text-muted-foreground/80 mt-2 list-inside list-disc space-y-0.5">
              {result.warnings.slice(0, 6).map((w, i) => (
                <li key={i}>
                  {w.row > 0 ? t("import.linePrefix", { row: w.row }) : ""}
                  {w.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
