import { FileText, Link2, Mail, MailX } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";

import { QualiteImportButton } from "@/components/qualite/qualite-import-button";
import type { InboxItem } from "@/lib/qualite/service";
import { cn } from "@/lib/utils";

export async function QualiteInbox({ items }: { items: InboxItem[] }) {
  const t = await getTranslations("qualite.inbox");
  const format = await getFormatter();

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-8 text-center text-sm">
        {t("empty")}
      </p>
    );
  }

  return (
    <ul className="divide-border/60 border-border divide-y rounded-[4px] border">
      {items.map((m) => (
        <li
          key={m.emailId}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start"
        >
          <Mail className="text-muted-foreground/60 mt-0.5 hidden size-4 shrink-0 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{m.subject}</p>
            <p className="text-muted-foreground/80 mt-0.5 truncate text-xs">
              {m.from} ·{" "}
              {format.dateTime(new Date(m.receivedAt), { dateStyle: "medium" })}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {m.pdfFilename ? (
                <span className="border-border bg-muted/40 inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 font-mono text-[11px]">
                  <FileText className="size-3" />
                  {m.pdfFilename}
                </span>
              ) : (
                <span className="text-muted-foreground/60 inline-flex items-center gap-1 text-[11px]">
                  <MailX className="size-3" />
                  {t("noPdf")}
                </span>
              )}
              {m.lotReference ? (
                <Link
                  href={m.lotId ? `/lots/${m.lotId}` : "#"}
                  className="text-primary inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
                >
                  <Link2 className="size-3" />
                  {t("matched", { ref: m.lotReference })}
                </Link>
              ) : m.pdfFilename ? (
                <span className="text-harvest inline-flex items-center gap-1 text-[11px]">
                  {t("unmatched")}
                </span>
              ) : null}
              {m.imported && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-medium",
                    m.importStatut === "rattache" ? "text-primary" : "text-destructive",
                  )}
                >
                  · {t(`status.${m.importStatut ?? "erreur"}`)}
                </span>
              )}
            </div>
          </div>
          {m.pdfFilename && (
            <QualiteImportButton emailId={m.emailId} imported={m.imported} />
          )}
        </li>
      ))}
    </ul>
  );
}
