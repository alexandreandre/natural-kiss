import { cn } from "@/lib/utils";

/** Marque Natural Kiss — pastille "feuille" + mot-symbole. */
export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg shadow-sm">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
          <path
            d="M12 3c5 0 8 3 8 8 0 5-4 9-9 9-1.5 0-3-.4-4-1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M6 19c0-6 4-10 10-11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {withWordmark && (
        <span className="text-[15px] font-semibold tracking-tight">
          Natural&nbsp;Kiss
        </span>
      )}
    </span>
  );
}
