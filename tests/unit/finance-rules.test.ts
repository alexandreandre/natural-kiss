import { describe, expect, it } from "vitest";

import {
  computeFactureCoherence,
  effectivePaymentStatus,
  isLitigeBlocking,
} from "@/lib/finance/rules";

describe("computeFactureCoherence", () => {
  it("aucune vérification lancée → inconnue", () => {
    expect(computeFactureCoherence([], false)).toBe("inconnue");
  });

  it("vérification lancée sans anomalie facture → cohérente", () => {
    expect(
      computeFactureCoherence(
        [{ valeurs: { sources: ["bl", "packing_list"] } }],
        true,
      ),
    ).toBe("coherente");
  });

  it("anomalie impliquant la facture → incohérente", () => {
    expect(
      computeFactureCoherence([{ valeurs: { sources: ["facture", "bl"] } }], true),
    ).toBe("incoherente");
  });
});

describe("isLitigeBlocking", () => {
  it("ouvert / en_cours bloquent, resolu / clos non", () => {
    expect(isLitigeBlocking("ouvert")).toBe(true);
    expect(isLitigeBlocking("en_cours")).toBe(true);
    expect(isLitigeBlocking("resolu")).toBe(false);
    expect(isLitigeBlocking("clos")).toBe(false);
  });
});

describe("effectivePaymentStatus", () => {
  it("un litige non résolu prime sur le statut déclaré (cas Voltz)", () => {
    expect(effectivePaymentStatus("en_attente", [{ statut: "en_cours" }])).toBe("litige");
  });

  it("sans litige bloquant, le statut déclaré est conservé", () => {
    expect(effectivePaymentStatus("paye", [])).toBe("paye");
    expect(effectivePaymentStatus("paye", [{ statut: "resolu" }])).toBe("paye");
  });
});
