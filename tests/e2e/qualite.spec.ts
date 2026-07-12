import { expect, test } from "@playwright/test";

/**
 * Brique 6 — parcours qualité : Hub email → import d'un PDF de retour →
 * analyse IA rattachée au lot, puis tendances agrégées.
 */
test("hub qualité : import d'un retour → analyse rattachée au bon lot", async ({
  page,
}) => {
  await page.goto("/qualite");
  await expect(page.getByRole("heading", { name: /boucle qualité/i })).toBeVisible();

  const row = page.locator("li", { hasText: "QCCheck_986640.pdf" });
  await row.getByRole("button", { name: /Importer|Ré-analyser/ }).click();

  await expect(page.getByText(/rattaché à LOT-2026-0002/i)).toBeVisible();
});

test("hub qualité : les tendances par produit/client/site sont affichées", async ({
  page,
}) => {
  await page.goto("/qualite");
  await expect(page.getByRole("heading", { name: /Tendances qualité/i })).toBeVisible();
  await expect(page.getByText(/Par produit/i)).toBeVisible();
  await expect(page.getByText(/Par client/i)).toBeVisible();
  await expect(page.getByText(/Par site/i)).toBeVisible();
});

test("fiche lot : le retour analysé apparaît (défauts extraits)", async ({ page }) => {
  await page.goto("/lots");
  await page.getByRole("link", { name: "LOT-2026-0002" }).click();

  await page.getByRole("tab", { name: "Qualité" }).click();
  await expect(page.getByText(/Floraison/).first()).toBeVisible();
  await expect(page.getByText(/Tiges creuses/).first()).toBeVisible();
});
