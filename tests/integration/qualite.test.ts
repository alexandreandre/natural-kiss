import { describe, expect, it } from "vitest";

import {
  getLotQcComparison,
  getQualiteTrends,
  importEmailQC,
  listQualiteInbox,
} from "@/lib/qualite/service";

/**
 * Brique 6 — boucle qualité contre Supabase (données de seed + boîte mock).
 * Requiert la migration 0006 appliquée (`npm run db:reset` ou `db:push`).
 */
describe("Qualité (Supabase, données de seed)", () => {
  it("la boîte de réception liste les mails avec PDF", async () => {
    const inbox = await listQualiteInbox();
    expect(inbox.length).toBeGreaterThan(0);
    expect(inbox.some((m) => m.pdfFilename?.endsWith(".pdf"))).toBe(true);
  });

  it("import du mail QCCheck_986640 → rattaché au lot + analysé (84, rouge)", async () => {
    const res = await importEmailQC("eml-qc-986640");
    expect(res.ok).toBe(true);
    expect(res.statut).toBe("rattache");
    expect(res.lotReference).toBe("LOT-2026-0002");
    expect(res.analysis?.score).toBe(84);
    expect(res.analysis?.verdict).toBe("rouge");
    expect(res.analysis?.defauts.map((d) => d.code)).toContain("tiges-creuses");
  });

  it("import idempotent (même email_id ⇒ un seul rapport rattaché)", async () => {
    const a = await importEmailQC("eml-qc-986640");
    const b = await importEmailQC("eml-qc-986640");
    expect(a.lotId).toBe(b.lotId);

    const cmp = await getLotQcComparison(a.lotId!);
    expect(cmp.retour?.verdict).toBe("rouge");
    expect(cmp.retour?.analyse?.score).toBe(84);
  });

  it("rattache la patate douce par n° de conteneur du nom de fichier", async () => {
    const res = await importEmailQC("eml-sweetpotato-qr");
    expect(res.statut).toBe("rattache");
    expect(res.lotReference).toBe("LOT-2026-0001");
    expect(res.analysis?.verdict).toBe("orange");
  });

  it("agrège les tendances par produit / client / site", async () => {
    const trends = await getQualiteTrends();
    expect(trends.total).toBeGreaterThan(0);
    expect(trends.byProduit.length).toBeGreaterThan(0);
    expect(trends.byClient.length).toBeGreaterThan(0);
    expect(trends.topDefauts.length).toBeGreaterThan(0);
  });
});
