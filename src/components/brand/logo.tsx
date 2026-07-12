import { cn } from "@/lib/utils";

/** Marque Natural Kiss — sceau carré (sprout + horizon) + mot-symbole éditorial. */
export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="bg-primary text-primary-foreground relative grid size-8 place-items-center rounded-[3px]">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
          {/* Ligne d'horizon / mer */}
          <path
            d="M4 16.5h16"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.5"
          />
          {/* Pousse */}
          <path
            d="M12 16.5V9m0 0c0-2.2 1.7-4 3.9-4C15.9 7.2 14.2 9 12 9Zm0 0C12 7 10.5 5.5 8.3 5.5 8.3 7.7 9.8 9 12 9Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        {/* Accent ocre — pastille d'angle */}
        <span className="bg-harvest absolute -right-0.5 -bottom-0.5 size-1.5 rounded-[1px]" />
      </span>
      {withWordmark && (
        <span className="font-display text-[17px] leading-none font-medium tracking-tight">
          Natural Kiss
        </span>
      )}
    </span>
  );
}
