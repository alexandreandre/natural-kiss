import { expect, test } from "@playwright/test";

/**
 * Brique 7 — parcours Demande & Onboarding : une demande "mangue → UK" lève une
 * alerte (certifs manquantes) ; une demande "brocoli → UK" déclenche l'envoi auto.
 */
test("mangue → UK : certifications insuffisantes + workflow de correction", async ({
  page,
}) => {
  const stamp = Date.now();
  await page.goto("/demande");

  await page.getByLabel("Client / prospect").fill(`E2E SHP ${stamp}`);
  await page.getByLabel("Produit").fill("Mangue");
  await page.getByLabel("Pays de destination").fill("UK");
  await page.getByRole("button", { name: /Recevoir & qualifier/ }).click();

  await expect(page.getByText(/Certifications insuffisantes/)).toBeVisible();
  await expect(page.getByText(/tâche\(s\) de correction/)).toBeVisible();
});

test("brocoli → UK : certifications suffisantes + envoi automatique du pack", async ({
  page,
}) => {
  const stamp = Date.now();
  await page.goto("/demande");

  await page.getByLabel("Client / prospect").fill(`E2E Barfoots ${stamp}`);
  await page.getByLabel("Produit").fill("Brocoli / Tenderstem");
  await page.getByLabel("Pays de destination").fill("UK");
  await page.getByRole("button", { name: /Recevoir & qualifier/ }).click();

  await expect(page.getByText(/Certifications suffisantes/)).toBeVisible();
  // Bandeau de résultat du formulaire (suffixe « au client » → cible unique).
  await expect(
    page.getByText(/certifications envoyés \(mock\) au client/),
  ).toBeVisible();
});

test("le coffre M0c et l'alerte d'expiration sont visibles", async ({ page }) => {
  await page.goto("/demande");
  await expect(
    page.getByRole("heading", { name: /Coffre à certifications/ }),
  ).toBeVisible();
  await expect(page.getByText(/GlobalG\.A\.P\./).first()).toBeVisible();
});
