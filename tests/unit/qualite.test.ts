import { describe, expect, it } from "vitest";

import { getQcAnalyzerProvider, qcAnalysisSchema } from "@/lib/adapters";
import {
  aggregateTrends,
  extractRefs,
  matchLot,
  verdictForScore,
  worstSeverite,
  type LotRef,
  type QcTrendReport,
} from "@/lib/qualite/rules";

// ── Rattachement mail → lot ──────────────────────────────────────────────────

describe("extractRefs — références dans sujet / nom de fichier", () => {
  it("extrait les n° de conteneur et réf. de lot", () => {
    const refs = extractRefs("QC report (OLMP2605160) — QCCheck_986640.pdf");
    expect(refs).toContain("OLMP2605160");
  });

  it("extrait un conteneur depuis le nom de fichier patate douce", () => {
    expect(extractRefs("BR41239_CAAU4027760_QR.pdf")).toContain("CAAU4027760");
  });

  it("reconnaît une référence de lot interne", () => {
    expect(extractRefs("Retour LOT-2026-0003 ok")).toContain("LOT-2026-0003");
  });

  it("ne renvoie rien sur un texte sans référence", () => {
    expect(extractRefs("bonjour, voici le rapport")).toEqual([]);
  });
});

describe("matchLot — résolution du lot", () => {
  const lots: LotRef[] = [
    { id: "l1", reference: "LOT-2026-0001", numeroConteneur: "CAAU4027760" },
    { id: "l2", reference: "LOT-2026-0002", numeroConteneur: "OLMP2605160" },
    { id: "l3", reference: "LOT-2026-0003", numeroConteneur: "TCLU4239771" },
  ];

  it("rattache par n° de conteneur", () => {
    expect(matchLot(["OLMP2605160"], lots)).toBe("l2");
  });

  it("rattache par référence de lot", () => {
    expect(matchLot(["LOT-2026-0001"], lots)).toBe("l1");
  });

  it("renvoie null si aucun lot ne correspond", () => {
    expect(matchLot(["ZZZZ0000000"], lots)).toBeNull();
  });

  it("renvoie null si plusieurs lots distincts correspondent (ambigu)", () => {
    expect(matchLot(["OLMP2605160", "TCLU4239771"], lots)).toBeNull();
  });
});

// ── Verdict dérivé / sévérité ────────────────────────────────────────────────

describe("verdictForScore & worstSeverite", () => {
  it("un défaut critique force le rouge quel que soit le score", () => {
    expect(verdictForScore(95, [{ severite: "critique" }])).toBe("rouge");
  });

  it("score < 85 ⇒ rouge", () => {
    expect(verdictForScore(84, [])).toBe("rouge");
  });

  it("défaut majeur ou score < 90 ⇒ orange", () => {
    expect(verdictForScore(88, [])).toBe("orange");
    expect(verdictForScore(95, [{ severite: "majeur" }])).toBe("orange");
  });

  it("score ≥ 90 sans majeur/critique ⇒ vert", () => {
    expect(verdictForScore(91, [{ severite: "mineur" }])).toBe("vert");
  });

  it("worstSeverite retourne la sévérité la plus élevée", () => {
    expect(
      worstSeverite([
        { severite: "mineur" },
        { severite: "critique" },
        { severite: "majeur" },
      ]),
    ).toBe("critique");
    expect(worstSeverite([])).toBeNull();
  });
});

// ── Analyse IA (mock déterministe, calqué sur les vrais PDF) ──────────────────

describe("QcAnalyzerProvider (mock) — fixtures réelles", () => {
  const analyzer = getQcAnalyzerProvider();

  it("QCCheck_986640 → score ≈ 84, rouge, floraison + tiges creuses", async () => {
    const a = await analyzer.analyze({
      filename: "QCCheck_986640.pdf",
      produit: "Tenderstem / Bimi",
    });
    expect(() => qcAnalysisSchema.parse(a)).not.toThrow();
    expect(a.score).toBe(84);
    expect(a.verdict).toBe("rouge");
    const codes = a.defauts.map((d) => d.code);
    expect(codes).toContain("floraison");
    expect(codes).toContain("tiges-creuses");
  });

  it("est déterministe (même PDF ⇒ même analyse)", async () => {
    const a = await analyzer.analyze({ filename: "QCCheck_995769.pdf" });
    const b = await analyzer.analyze({ filename: "QCCheck_995769.pdf" });
    expect(a).toEqual(b);
    expect(a.verdict).toBe("vert");
  });

  it("fraise → Botrytis critique", async () => {
    const a = await analyzer.analyze({
      filename: "ENR_FA_Fraise.pdf",
      produit: "Fraise",
    });
    expect(
      a.defauts.some((d) => d.code === "botrytis" && d.severite === "critique"),
    ).toBe(true);
  });

  it("PDF inconnu → analyse conforme par défaut (validée)", async () => {
    const a = await analyzer.analyze({ filename: "inconnu.pdf", produit: "Ail" });
    expect(() => qcAnalysisSchema.parse(a)).not.toThrow();
    expect(a.verdict).toBe("vert");
    expect(a.defauts).toEqual([]);
  });
});

// ── Tendances (agrégation pure) ──────────────────────────────────────────────

describe("aggregateTrends — tendances par produit / client / site", () => {
  const reports: QcTrendReport[] = [
    {
      produit: "Tenderstem / Bimi",
      clientNom: "Barfoots",
      site: "Al Batoul",
      verdict: "rouge",
      score: 84,
      defauts: [
        {
          code: "floraison",
          libelle: "Floraison",
          categorie: "aspect",
          severite: "majeur",
        },
        {
          code: "tiges-creuses",
          libelle: "Tiges creuses",
          categorie: "aspect",
          severite: "majeur",
        },
      ],
    },
    {
      produit: "Tenderstem / Bimi",
      clientNom: "Barfoots",
      site: "Al Batoul",
      verdict: "vert",
      score: 91,
      defauts: [
        {
          code: "floraison",
          libelle: "Floraison",
          categorie: "aspect",
          severite: "mineur",
        },
      ],
    },
    {
      produit: "Patate douce",
      clientNom: "Georges Helfer",
      site: "New Cairo",
      verdict: "orange",
      score: 70,
      defauts: [
        {
          code: "radicelles",
          libelle: "Radicelles",
          categorie: "aspect",
          severite: "majeur",
        },
      ],
    },
  ];

  it("regroupe par produit avec verdicts et score moyen", () => {
    const trends = aggregateTrends(reports);
    expect(trends.total).toBe(3);
    const bimi = trends.byProduit.find((g) => g.key === "Tenderstem / Bimi");
    expect(bimi?.total).toBe(2);
    expect(bimi?.rouge).toBe(1);
    expect(bimi?.vert).toBe(1);
    expect(bimi?.scoreMoyen).toBe(88); // (84 + 91) / 2 = 87.5 → 88
  });

  it("classe les groupes les plus « à problème » en premier", () => {
    const trends = aggregateTrends(reports);
    expect(trends.byProduit[0]?.rouge).toBeGreaterThanOrEqual(
      trends.byProduit[trends.byProduit.length - 1]?.rouge ?? 0,
    );
  });

  it("compte les défauts récurrents (floraison ×2 en tête)", () => {
    const trends = aggregateTrends(reports);
    expect(trends.topDefauts[0]?.code).toBe("floraison");
    expect(trends.topDefauts[0]?.count).toBe(2);
  });

  it("agrège aussi par client et par site", () => {
    const trends = aggregateTrends(reports);
    expect(trends.byClient.find((g) => g.key === "Barfoots")?.total).toBe(2);
    expect(trends.bySite.find((g) => g.key === "Al Batoul")?.total).toBe(2);
  });
});
