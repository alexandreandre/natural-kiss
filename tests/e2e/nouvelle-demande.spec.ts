import { expect, test } from "@playwright/test";

/**
 * Brique 7bis — la page publique client soumet une demande et affiche une
 * confirmation neutre (le résultat du matching reste côté interne).
 */
test("un client soumet une demande depuis la page publique", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/nouvelle-demande");

  await expect(
    page.getByRole("heading", { name: /Demandez un produit/ }),
  ).toBeVisible();

  await page.getByLabel("Votre société").fill(`E2E Client ${stamp}`);
  await page.getByLabel("Email de contact").fill(`e2e-${stamp}@example.com`);
  await page.getByLabel("Produit souhaité").fill("Brocoli / Tenderstem");
  await page.getByLabel("Pays de destination").fill("UK");
  await page.getByRole("button", { name: /Envoyer ma demande/ }).click();

  await expect(page.getByText(/Demande bien reçue/)).toBeVisible();
});
