import { Eye, EyeOff, ImageOff, PackageCheck } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { PreuveUpload } from "@/components/chargement/preuve-upload";
import type { PreuveItem } from "@/lib/chargement/service";
import { cn } from "@/lib/utils";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground/70 mb-3 font-mono text-[10px] tracking-[0.14em] uppercase">
      {children}
    </h3>
  );
}

/**
 * Panneau interne de capture des preuves de chargement (M5) : dépôt d'une
 * photo boîte / QR + galerie des preuves déjà rattachées au lot (miniatures
 * via URL signée). Affiche la visibilité client de chaque preuve.
 */
export async function ChargementPanel({
  lotId,
  preuves,
}: {
  lotId: string;
  preuves: PreuveItem[];
}) {
  const t = await getTranslations("chargement");
  const format = await getFormatter();

  return (
    <div className="space-y-7">
      <div className="border-border rounded-[4px] border p-5 sm:p-6">
        <p className="text-muted-foreground/70 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
          <PackageCheck className="size-3.5" />
          {t("panelTitle")}
        </p>
        <p className="text-muted-foreground mt-3 max-w-[60ch] text-sm">
          {t("panelHelp")}
        </p>
      </div>

      <section>
        <SectionTitle>{t("captureTitle")}</SectionTitle>
        <PreuveUpload lotId={lotId} />
      </section>

      <section>
        <SectionTitle>{t("gallery")}</SectionTitle>
        {preuves.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-[4px] border border-dashed p-6 text-center text-sm">
            {t("empty")}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {preuves.map((p) => (
              <li
                key={p.id}
                className="border-border overflow-hidden rounded-[4px] border"
              >
                <div className="bg-muted/40 flex aspect-4/3 items-center justify-center">
                  {p.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.signedUrl}
                      alt={t(`preuveType.${p.type}`)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageOff className="text-muted-foreground/50 size-6" />
                  )}
                </div>
                <div className="space-y-1 p-2.5">
                  <p className="text-xs font-medium">{t(`preuveType.${p.type}`)}</p>
                  {p.priseLe && (
                    <p className="text-muted-foreground/70 font-mono text-[10px] tabular-nums">
                      {format.dateTime(new Date(p.priseLe), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  )}
                  <p
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-medium",
                      p.visibleClient ? "text-primary" : "text-muted-foreground/70",
                    )}
                  >
                    {p.visibleClient ? (
                      <Eye className="size-3" />
                    ) : (
                      <EyeOff className="size-3" />
                    )}
                    {p.visibleClient ? t("visibleClient") : t("internalOnly")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
