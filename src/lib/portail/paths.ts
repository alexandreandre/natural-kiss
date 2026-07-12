/**
 * Helpers de chemins Storage du portail (pur, sans dépendance serveur → testable).
 */

/** Clé d'objet Storage du bucket `preuves` (préfixe de bucket retiré si présent). */
export function preuveObjectKey(storagePath: string): string {
  return storagePath.replace(/^preuves\//, "");
}
