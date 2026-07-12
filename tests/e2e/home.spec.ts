import { expect, test } from "@playwright/test";

/**
 * Accueil épuré : l'app charge, la grille des modules s'affiche, et l'action
 * principale (suivre un conteneur) mène à la page de suivi.
 */
test("la home charge, liste les modules et mène au suivi conteneur", async ({
  page,
}) => {
  await page.goto("/");

  // L'app est montée (marque visible).
  await expect(page.getByText("Natural Kiss").first()).toBeVisible();

  // La grille des modules liste le socle (M0 · Référentiel) marqué actif.
  await expect(page.getByRole("heading", { name: "Référentiel" })).toBeVisible();
  await expect(page.getByText("Actif").first()).toBeVisible();

  // L'action principale mène à la page de suivi (P0).
  await page.getByRole("link", { name: "Suivre un conteneur" }).click();
  await expect(page).toHaveURL(/\/tracking/);
  await expect(
    page.getByRole("heading", { name: /Suivez tout le voyage/ }),
  ).toBeVisible();
});
