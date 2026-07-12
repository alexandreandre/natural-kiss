import { MapPin } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { ModeIcon } from "@/components/tracking/mode-icon";
import { cn } from "@/lib/utils";
import type { TrackingEvent } from "@/lib/adapters/types";

export function TrackingTimeline({
  events,
  currentIndex,
}: {
  events: TrackingEvent[];
  currentIndex: number;
}) {
  const t = useTranslations("tracking");
  const format = useFormatter();

  return (
    <ol className="relative">
      {events.map((event, i) => {
        const done = i <= currentIndex;
        const current = i === currentIndex;
        const isLast = i === events.length - 1;

        return (
          <li
            key={`${event.code}-${event.at}`}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-6 -bottom-0 left-[13px] w-px",
                  done ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border",
                current
                  ? "border-primary bg-primary text-primary-foreground"
                  : done
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground/60",
              )}
            >
              <ModeIcon mode={event.mode} className="size-3.5" />
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span
                  className={cn(
                    "text-sm font-medium",
                    !done && "text-muted-foreground",
                  )}
                >
                  {t(`eventCodes.${event.code}`)}
                </span>
                <time
                  className="text-muted-foreground/80 font-mono text-[11px] tabular-nums"
                  dateTime={event.at}
                >
                  {format.dateTime(new Date(event.at), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </div>
              <p className="text-muted-foreground mt-0.5 text-[13px]">{event.label}</p>
              <p className="text-muted-foreground/70 mt-1 flex items-center gap-1 text-xs">
                <MapPin className="size-3" />
                {event.location}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
