"use client";

import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { uploadDocumentAction } from "@/lib/gate/actions";
import type { DocumentType } from "@/lib/data/lots";

const DOC_TYPES: DocumentType[] = [
  "facture",
  "bl",
  "phyto",
  "packing_list",
  "certificat_origine",
  "ched_pp",
  "autre",
];

export function DocumentUpload({ lotId }: { lotId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      className="border-border flex flex-col gap-3 rounded-[4px] border border-dashed p-4 sm:flex-row sm:items-end"
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          const res = await uploadDocumentAction(formData);
          if (!res.ok) {
            setError(res.error ?? "Erreur");
            return;
          }
          formRef.current?.reset();
          router.refresh();
        })
      }
    >
      <input type="hidden" name="lotId" value={lotId} />

      <label className="flex flex-1 flex-col gap-1.5">
        <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.12em] uppercase">
          {t("gate.upload.type")}
        </span>
        <select
          name="type"
          defaultValue="facture"
          className="border-border bg-background h-8 rounded-md border px-2 text-sm"
        >
          {DOC_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`lots.documents.type.${type}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-[2] flex-col gap-1.5">
        <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.12em] uppercase">
          {t("gate.upload.file")}
        </span>
        <input
          type="file"
          name="file"
          required
          className="text-muted-foreground file:border-border file:bg-muted file:text-foreground text-sm file:mr-3 file:rounded-md file:border file:px-2 file:py-1 file:text-xs"
        />
      </label>

      <div className="flex flex-col gap-1">
        <Button type="submit" variant="outline" size="lg" disabled={pending}>
          <Upload className="size-4" />
          {pending ? t("gate.upload.uploading") : t("gate.upload.submit")}
        </Button>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </form>
  );
}
