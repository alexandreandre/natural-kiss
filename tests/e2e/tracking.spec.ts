import { expect, test } from "@playwright/test";

/**
 * Brique 1 (P0) — parcours principal : « saisir un numéro → voir tout le voyage ».
 */
test("suit un conteneur connu : frise, carte, courbe et score de risque", async ({
  page,
}) => {
  await page.goto("/tracking");

  // Saisie du numéro de conteneur puis soumission.
  await page.getByPlaceholder(/CAAU4027760/).fill("CAAU4027760");
  await page.getByRole("button", { name: "Suivre" }).click();

  await expect(page).toHaveURL(/q=CAAU4027760/);

  // En-tête du lot résolu depuis Supabase.
  await expect(page.getByRole("heading", { name: /Patate douce/ })).toBeVisible();

  // Frise, carte et courbe présentes.
  await expect(page.getByText("Frise du voyage")).toBeVisible();
  await expect(page.getByTestId("map-view")).toBeVisible();
  await expect(page.getByTestId("sensor-chart")).toBeVisible();

  // Le score de risque d'arrivée est affiché.
  await expect(
    page.getByRole("heading", { name: "Score de risque d'arrivée" }),
  ).toBeVisible();
});

test("le lot maritime « fatigué » (OLMP2605160) affiche un risque élevé", async ({
  page,
}) => {
  await page.goto("/tracking?q=OLMP2605160");
  await expect(
    page.getByRole("heading", { name: "Score de risque d'arrivée" }),
  ).toBeVisible();
  await expect(page.getByText("Risque élevé")).toBeVisible();
});

test("un numéro inconnu affiche un message clair", async ({ page }) => {
  await page.goto("/tracking?q=ZZZU0000000");
  await expect(page.getByText(/Aucun lot trouvé/)).toBeVisible();
});
