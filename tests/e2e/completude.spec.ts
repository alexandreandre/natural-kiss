import { expect, test } from "@playwright/test";

/**
 * Brique 8 — Complétude du flux : origine multi-sites (M0b), finance/litige
 * Voltz (M10), alertes proactives (T5) et copilot (T4).
 */
test("lot Bimi RoRo « fatigué » → excursion température détectée par le moteur d'alertes", async ({
  page,
}) => {
  await page.goto("/lots");
  await page.getByRole("link", { name: "LOT-2026-0002" }).click();

  await page.getByRole("tab", { name: /Alertes/ }).click();
  const panel = page.getByRole("tabpanel", { name: /Alertes/ });
  await panel.getByRole("button", { name: /Scanner ce lot/ }).click();

  await expect(panel.getByText(/Excursion de température/).first()).toBeVisible();
});

test("origine champ : site de production visible sur la fiche lot", async ({
  page,
}) => {
  await page.goto("/lots");
  await page.getByRole("link", { name: "LOT-2026-0005" }).click();

  await page.getByRole("tab", { name: /Origine/ }).click();
  await expect(page.getByText(/El Saada — Ismailia/)).toBeVisible();
});

test("finance : le lot Voltz (slips) apparaît en litige", async ({ page }) => {
  await page.goto("/finance");
  await expect(page.getByRole("heading", { name: /Statut de paiement/ })).toBeVisible();

  const row = page.getByRole("link", { name: /LOT-2026-0004/ });
  await expect(row).toBeVisible();
  await expect(row.getByText(/En litige/)).toBeVisible();
});

test("copilot : résumé du fil Voltz + actions suggérées", async ({ page }) => {
  await page.goto("/copilot");
  await page
    .getByText(/Voltz \(OTPU6220580\)/i)
    .first()
    .click();
  await page.getByRole("button", { name: /Résumer le fil/ }).click();

  await expect(page.getByText(/Résumé/)).toBeVisible();
  await expect(page.getByText(/litige|quarantaine/i).first()).toBeVisible();
});
