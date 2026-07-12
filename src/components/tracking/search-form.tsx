"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EXAMPLES = ["CAAU4027760", "OLMP2605160", "TCLU4239771"];

export function SearchForm({ initialQuery = "" }: { initialQuery?: string }) {
  const t = useTranslations("tracking");
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [pending, startTransition] = useTransition();

  function go(next: string) {
    const q = next.trim();
    if (!q) return;
    startTransition(() => {
      router.push(`/tracking?q=${encodeURIComponent(q)}`);
    });
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label className="sr-only" htmlFor="tracking-query">
          {t("searchLabel")}
        </label>
        <div className="border-input focus-within:border-ring focus-within:ring-ring/50 bg-background flex flex-1 items-center gap-2.5 rounded-lg border px-3 transition-[color,box-shadow] focus-within:ring-3">
          <Search className="text-muted-foreground/70 size-4 shrink-0" />
          <input
            id="tracking-query"
            name="q"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            className="h-10 w-full bg-transparent font-mono text-sm tracking-wide outline-none placeholder:font-sans placeholder:tracking-normal"
          />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="h-10 px-4">
          {t("searchButton")}
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.12em] uppercase">
          {t("examplesLabel")}
        </span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setValue(ex);
              go(ex);
            }}
            className={cn(
              "border-border hover:border-primary/50 hover:text-primary rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors",
              initialQuery.toUpperCase() === ex && "border-primary text-primary",
            )}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
