import { expect, test } from "@playwright/test";

/**
 * Brique 9 — parcours Booking (M4) : dossier de réservation généré depuis une
 * demande, puis confirmation unique (3 champs) qui crée le lot. Vérifie aussi
 * la réservation directe (sans dossier préalable) pour les canaux hors outil.
 */

test("le registre affiche les dossiers de démonstration (brouillon / envoyé / confirmé)", async ({
  page,
}) => {
  await page.goto("/booking");

  await expect(page.getByRole("heading", { name: /Registre des dossiers/ })).toBeVisible();
  await expect(page.getByRole("list").getByText("SHP Tropical Ltd")).toBeVisible();

  // Le dossier confirmé (Exo3) est déjà lié à son lot.
  const exo3Item = page.getByRole("listitem").filter({ hasText: "Exo3" });
  await expect(exo3Item.getByText("LOT-2026-0005")).toBeVisible();
});

test("nouvelle demande : génère un dossier brouillon", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/booking");

  await page.locator("#clientId").selectOption({ label: "Georges Helfer SA" });
  await page.locator("#produit").fill(`E2E Patate douce ${stamp}`);
  await page.locator("#destinationPays").fill("FR");
  await page.getByRole("button", { name: /Générer le dossier/ }).click();

  await expect(page.getByText(/Dossier généré/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(`E2E Patate douce ${stamp}`)).toBeVisible();
});

test("confirmation directe (sans dossier) crée le lot", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/booking");

  await expect(page.getByRole("heading", { name: /Réservation directe/ })).toBeVisible();

  await page.locator("#quick-clientId").selectOption({ label: "Barfoots of Botley Ltd" });
  await page.locator("#quick-produit").fill(`E2E Direct ${stamp}`);
  await page.locator("#numeroConteneur").fill(`E2ECTR${stamp}`);
  await page.locator("#transporteurNom").fill("MSC / Borchard");
  await page.locator("#dateDepart").fill("2026-09-20");
  await page.getByRole("button", { name: /Confirmer le booking/ }).click();

  // Confirmation visuelle explicite (lien vers le lot créé) avant de naviguer,
  // pour éviter toute course avec l'insert asynchrone.
  await expect(page.getByText(/^Lot LOT-\d{4}-\d{4} créé$/)).toBeVisible({ timeout: 15000 });

  // La réservation directe ne passe pas par un dossier : le lot créé se
  // retrouve directement dans le registre des lots (M4 → objet Lot, Brique 2).
  await page.goto(`/lots?produit=${encodeURIComponent(`E2E Direct ${stamp}`)}`);
  await expect(page.getByText(`E2ECTR${stamp}`)).toBeVisible();
});
