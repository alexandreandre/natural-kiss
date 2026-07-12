import { expect, test } from "@playwright/test";

/**
 * Brique 2 — parcours principal : « liste des lots → fiche 360° avec le voyage ».
 */
test("navigation liste → fiche : le voyage (Brique 1) s'affiche dans la fiche", async ({
  page,
}) => {
  await page.goto("/lots");

  // La liste est là et contient les lots de démo.
  await expect(page.getByRole("link", { name: "LOT-2026-0002" })).toBeVisible();

  // Ouvre la fiche du lot Bimi "fatigué" (risque le plus élevé, listé en premier).
  await page.getByRole("link", { name: "LOT-2026-0002" }).click();

  await expect(page).toHaveURL(/\/lots\/[0-9a-f-]{36}/);

  // En-tête de la fiche 360°.
  await expect(page.getByRole("heading", { name: /Tenderstem \/ Bimi/ })).toBeVisible();

  // Onglet Voyage actif par défaut : frise + carte réutilisées de la Brique 1.
  await expect(page.getByText("Frise du voyage")).toBeVisible();
  await expect(page.getByTestId("map-view")).toBeVisible();

  // Les autres onglets de la fiche sont présents.
  await expect(page.getByRole("tab", { name: "Documents" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Qualité" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Origine" })).toBeVisible();

  // Bascule sur l'onglet Qualité → un rapport (verdict) est visible.
  await page.getByRole("tab", { name: "Qualité" }).click();
  await expect(page.getByText("Non conforme")).toBeVisible();
});

test("filtre par statut : ne conserve que les lots rejetés", async ({ page }) => {
  await page.goto("/lots?statut=rejete");

  await expect(page.getByRole("link", { name: "LOT-2026-0002" })).toBeVisible();
  await expect(page.getByRole("link", { name: "LOT-2026-0001" })).toHaveCount(0);
});
