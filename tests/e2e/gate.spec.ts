import { expect, test } from "@playwright/test";

/**
 * Brique 3 — parcours Gate : dépôt/vérification → anomalie → blocage,
 * puis dossier cohérent → Gate verte + mail (mock) tracé.
 */
test("dossier incohérent → anomalie conteneur + Gate rouge", async ({ page }) => {
  await page.goto("/lots");
  await page.getByRole("link", { name: "LOT-2026-0004" }).click();

  await page.getByRole("tab", { name: /Conformité & Gate/ }).click();
  await page.getByRole("button", { name: /Lancer la vérification/ }).click();

  await expect(page.getByText(/Bloqué/)).toBeVisible();
  await expect(page.getByText(/conteneur/i).first()).toBeVisible();
});

test("dossier cohérent → Gate verte + mail « Check OK »", async ({ page }) => {
  await page.goto("/lots");
  await page.getByRole("link", { name: "LOT-2026-0003" }).click();

  await page.getByRole("tab", { name: /Conformité & Gate/ }).click();
  await page.getByRole("button", { name: /Lancer la vérification/ }).click();

  await expect(page.getByText(/Check OK/).first()).toBeVisible();
  await expect(page.getByText(/Mail « Check OK » envoyé/).first()).toBeVisible();
});

test("aperçu /gate liste les lots avec leur statut", async ({ page }) => {
  await page.goto("/gate");
  await expect(page.getByRole("heading", { name: /Check OK/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /LOT-2026-0004/ })).toBeVisible();
});
