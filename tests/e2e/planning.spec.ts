import path from "node:path";

import { expect, test } from "@playwright/test";

/**
 * Brique 5 — parcours principal : « importer l'Excel → planning rempli → KPI ».
 */
// Playwright s'exécute depuis le dossier `platform/` (racine du projet Next).
const SAMPLE = path.resolve(process.cwd(), "public/exemples/planning-exemple.xlsx");

test("import Excel → planning prévu/réalisé → dashboard KPI", async ({ page }) => {
  await page.goto("/planning");

  await expect(page.getByRole("heading", { name: /Planning de départ/ })).toBeVisible();

  // Import du fichier d'exemple.
  await page.locator('input[type="file"]').setInputFiles(SAMPLE);
  await page.getByRole("button", { name: "Importer" }).click();

  // Confirmation d'import + lignes visibles dans le planning.
  await expect(page.getByText(/ligne\(s\) importée\(s\)/)).toBeVisible();
  await expect(page.getByText("2026-W30").first()).toBeVisible();

  // Le KPI de réalisation est présent.
  await expect(page.getByText("Taux de réalisation")).toBeVisible();

  // Le dashboard affiche les KPIs de service.
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Pilotez votre service/ }),
  ).toBeVisible();
  await expect(page.getByText("Taux de service", { exact: true })).toBeVisible();
  await expect(page.getByText("Taux de retard", { exact: true })).toBeVisible();
});
