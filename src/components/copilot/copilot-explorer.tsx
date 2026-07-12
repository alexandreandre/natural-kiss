"use client";

import { Bot, FileText, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { generateDocumentAction, summarizeThreadAction } from "@/lib/copilot/actions";
import type {
  GenerateDocumentResult,
  ThreadSummaryResult,
} from "@/lib/copilot/service";
import type { ThreadListItem } from "@/lib/copilot/service";
import { cn } from "@/lib/utils";

export function CopilotExplorer({ threads }: { threads: ThreadListItem[] }) {
  const t = useTranslations("copilot");
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(threads[0]?.key ?? null);
  const [summary, setSummary] = useState<ThreadSummaryResult | null>(null);
  const [doc, setDoc] = useState<GenerateDocumentResult | null>(null);

  const selectedThread = threads.find((th) => th.key === selected) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <ul className="divide-border/60 border-border divide-y rounded-[4px] border lg:self-start">
        {threads.map((th) => (
          <li key={th.key}>
            <button
              type="button"
              onClick={() => {
                setSelected(th.key);
                setSummary(null);
                setDoc(null);
              }}
              className={cn(
                "flex w-full flex-col gap-0.5 px-3.5 py-3 text-left text-sm transition-colors",
                th.key === selected ? "bg-accent/50" : "hover:bg-accent/30",
              )}
            >
              <span className="line-clamp-2 font-medium">{th.subject}</span>
              <span className="text-muted-foreground/70 font-mono text-[11px]">
                {t("messageCount", { count: th.messageCount })}
                {th.lotReference ? ` · ${th.lotReference}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-6">
        {selectedThread ? (
          <>
            <div className="border-border rounded-[4px] border p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted-foreground/70 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
                  <Bot className="size-3.5" />
                  {t("summarize")}
                </p>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await summarizeThreadAction(selectedThread.key);
                      setSummary(res);
                    })
                  }
                >
                  <Sparkles className={cn("size-3.5", pending && "animate-pulse")} />
                  {pending ? t("running") : t("summarize")}
                </Button>
              </div>

              {summary && (
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-muted-foreground/70 mb-1.5 font-mono text-[10px] tracking-[0.12em] uppercase">
                      {t("summary")}
                    </p>
                    <pre className="border-border bg-muted/20 overflow-x-auto rounded-[4px] border p-3 text-xs whitespace-pre-wrap">
                      {summary.summary.resume}
                    </pre>
                  </div>
                  {summary.summary.actions.length > 0 && (
                    <div>
                      <p className="text-muted-foreground/70 mb-1.5 font-mono text-[10px] tracking-[0.12em] uppercase">
                        {t("actions")}
                      </p>
                      <ul className="list-inside list-disc text-sm">
                        {summary.summary.actions.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground/70 mb-1.5 font-mono text-[10px] tracking-[0.12em] uppercase">
                      {t("draftReply")}
                    </p>
                    <pre className="border-border bg-muted/20 overflow-x-auto rounded-[4px] border p-3 text-xs whitespace-pre-wrap">
                      {summary.draftReply}
                    </pre>
                  </div>
                  <p className="text-muted-foreground/50 font-mono text-[10px]">
                    {t("model")}: {summary.model}
                  </p>
                </div>
              )}
            </div>

            {selectedThread.lotId && (
              <div className="border-border rounded-[4px] border p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-muted-foreground/70 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
                    <FileText className="size-3.5" />
                    {t("generateSheet")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await generateDocumentAction(
                          "instruction_sheet",
                          selectedThread.lotId!,
                        );
                        setDoc(res);
                      })
                    }
                  >
                    {t("generate")}
                  </Button>
                </div>
                {doc && (
                  <pre className="border-border bg-muted/20 mt-4 overflow-x-auto rounded-[4px] border p-3 text-xs whitespace-pre-wrap">
                    {doc.content}
                  </pre>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-10 text-center text-sm">
            {t("empty")}
          </p>
        )}
      </div>
    </div>
  );
}
