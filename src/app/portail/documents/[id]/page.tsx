import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isFeatureEnabled } from "@/lib/feature-flags";
import { getMyDocument } from "@/lib/portail/data";
import { requirePortailContext } from "@/lib/portail/session";

export const dynamic = "force-dynamic";

export default async function PortailDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isFeatureEnabled("PORTAIL")) notFound();

  await requirePortailContext();
  const { id } = await params;
  const t = await getTranslations("portail");
  const doc = await getMyDocument(id);

  return (
    <div className="space-y-6">
      <Link
        href="/portail"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        {t("backToLots")}
      </Link>

      {!doc ? (
        <div className="border-border rounded-[4px] border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">{t("notFound")}</p>
        </div>
      ) : (
        <article className="border-border rounded-[4px] border p-6 sm:p-8">
          {/* Contenu généré par nos propres gabarits (documents.ts) — pas d'entrée
              utilisateur libre non échappée : rendu HTML sûr. */}
          <div
            className="max-w-none text-sm leading-relaxed [&_h1]:font-display [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-medium [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-medium [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:mb-2.5 [&_ul]:my-2"
            dangerouslySetInnerHTML={{ __html: doc.contenuHtml }}
          />
        </article>
      )}
    </div>
  );
}
