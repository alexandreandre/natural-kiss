import { describe, expect, it } from "vitest";

import { buildOnboardingDocuments } from "@/lib/onboarding/documents";

describe("buildOnboardingDocuments", () => {
  const base = {
    clientNom: "Barfoots of Botley Ltd",
    produit: "Brocoli / Tenderstem",
    paysCode: "UK",
    certifsLabels: ["GlobalG.A.P.", "GRASP", "BRCGS", "SMETA", "Sedex"],
  };

  it("génère les 3 documents (bienvenue, certifs, produit) dans l'ordre", () => {
    const docs = buildOnboardingDocuments(base);
    expect(docs.map((d) => d.type)).toEqual(["bienvenue", "certifs", "produit"]);
  });

  it("le document de bienvenue nomme le client et le lien portail", () => {
    const [bienvenue] = buildOnboardingDocuments(base);
    expect(bienvenue.titre).toContain("Barfoots of Botley Ltd");
    expect(bienvenue.contenuHtml).toContain("Barfoots of Botley Ltd");
    expect(bienvenue.contenuHtml).toContain("/portail/login");
  });

  it("le document certifs liste les certifications couvertes", () => {
    const certifs = buildOnboardingDocuments(base).find((d) => d.type === "certifs")!;
    expect(certifs.contenuHtml).toContain("GlobalG.A.P.");
    expect(certifs.contenuHtml).toContain("Sedex");
  });

  it("la fiche produit mentionne produit et pays", () => {
    const produit = buildOnboardingDocuments(base).find((d) => d.type === "produit")!;
    expect(produit.contenuHtml).toContain("Brocoli / Tenderstem");
    expect(produit.contenuHtml).toContain("UK");
  });

  it("échappe le HTML des entrées (pas d'injection via le nom)", () => {
    const docs = buildOnboardingDocuments({ ...base, clientNom: "<script>x</script>" });
    expect(docs[0].contenuHtml).not.toContain("<script>");
    expect(docs[0].contenuHtml).toContain("&lt;script&gt;");
  });
});
