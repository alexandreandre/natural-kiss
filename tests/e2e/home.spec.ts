import { expect, test } from "@playwright/test";

/**
 * Brique 0 — parcours principal : « l'app charge et lit un lot depuis Supabase ».
 */
test("la home charge et affiche un lot lu depuis Supabase", async ({ page }) => {
  await page.goto("/");

  // L'app est montée (marque visible).
  await expect(page.getByText("Natural Kiss").first()).toBeVisible();

  // Un lot de démo réel est rendu (n° de conteneur issu du seed Supabase).
  await expect(page.getByText("CAAU4027760")).toBeVisible();

  // Le tableau des lots récents est présent avec plusieurs lignes.
  const rows = page.locator("table tbody tr");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThanOrEqual(3);

  // La grille des modules liste le socle (M0 · Référentiel) marqué actif.
  await expect(page.getByRole("heading", { name: "Référentiel" })).toBeVisible();
  await expect(page.getByText("Actif").first()).toBeVisible();
});
