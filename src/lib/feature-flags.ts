/**
 * Feature flags — activation/désactivation des modules par brique.
 *
 * Chaque flag correspond à une capacité livrée par une brique. En Brique 0,
 * seul le socle (référentiel M0) est actif ; les modules des briques suivantes
 * sont déclarés mais désactivés, et deviendront actifs quand leur brique passera
 * sa Definition of Done.
 *
 * Surcharge à l'exécution : `NEXT_PUBLIC_FLAG_<CLE>=true|false`
 * (ex. `NEXT_PUBLIC_FLAG_TRACKING=true`).
 */

export const FEATURE_FLAGS = {
  /** M0 — Référentiel / Master Data (Brique 0). */
  REFERENTIEL: true,
  /** M7 — Suivi de voyage par n° de conteneur (Brique 1). */
  TRACKING: false,
  /** Liste & fiche détaillée d'un lot (Brique 2). */
  LOTS: false,
  /** M6 — Documents, conformité, vérificateur IA & Gate (Brique 3). */
  GATE: false,
  /** M5 + T1 — Chargement, preuve produit & portail client (Brique 4). */
  PORTAIL: false,
  /** T3 + M3 — Dashboard, KPIs & planning prévu/réalisé (Brique 5). */
  DASHBOARD: false,
  /** T2 + M9 — Hub email & analyse IA des retours qualité (Brique 6). */
  EMAIL_HUB: false,
  /** M1 + M2 + M0c — Demande, onboarding & coffre certifications (Brique 7). */
  ONBOARDING: false,
  /** M0b + M10 + T4 + T5 — Cropwise, finance, copilot & alertes (Brique 8). */
  COMPLETUDE: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

const truthy = new Set(["1", "true", "on", "yes"]);
const falsy = new Set(["0", "false", "off", "no"]);

/**
 * Résout un flag : surcharge d'environnement `NEXT_PUBLIC_FLAG_<CLE>` prioritaire,
 * sinon valeur par défaut compilée.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const override = readOverride(flag);
  if (override !== undefined) return override;
  return FEATURE_FLAGS[flag];
}

function readOverride(flag: FeatureFlag): boolean | undefined {
  // Les `NEXT_PUBLIC_*` étant inlinées statiquement par Next, on lit la table
  // complète et on sélectionne — plutôt qu'une clé dynamique non inlinable.
  const raw = OVERRIDES[flag];
  if (raw === undefined) return undefined;
  const v = raw.trim().toLowerCase();
  if (truthy.has(v)) return true;
  if (falsy.has(v)) return false;
  return undefined;
}

const OVERRIDES: Record<FeatureFlag, string | undefined> = {
  REFERENTIEL: process.env.NEXT_PUBLIC_FLAG_REFERENTIEL,
  TRACKING: process.env.NEXT_PUBLIC_FLAG_TRACKING,
  LOTS: process.env.NEXT_PUBLIC_FLAG_LOTS,
  GATE: process.env.NEXT_PUBLIC_FLAG_GATE,
  PORTAIL: process.env.NEXT_PUBLIC_FLAG_PORTAIL,
  DASHBOARD: process.env.NEXT_PUBLIC_FLAG_DASHBOARD,
  EMAIL_HUB: process.env.NEXT_PUBLIC_FLAG_EMAIL_HUB,
  ONBOARDING: process.env.NEXT_PUBLIC_FLAG_ONBOARDING,
  COMPLETUDE: process.env.NEXT_PUBLIC_FLAG_COMPLETUDE,
};
