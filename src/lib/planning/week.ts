/**
 * Helpers de semaine ISO — **purs et testés** (Brique 5, M3).
 *
 * Le planning est organisé « semaine par semaine ». On normalise tout vers une
 * clé ISO stable `YYYY-Www` (ex. `2026-W12`) + le lundi de la semaine (pour le
 * tri et le regroupement). Aucune dépendance au fuseau : on raisonne sur la
 * partie date (`YYYY-MM-DD`) telle qu'écrite.
 */

export interface IsoWeek {
  /** Clé ISO stable, ex. `2026-W12`. */
  iso: string;
  /** Année ISO (peut différer de l'année civile en début/fin d'année). */
  isoYear: number;
  /** Numéro de semaine ISO (1–53). */
  week: number;
  /** Lundi de la semaine, `YYYY-MM-DD`. */
  monday: string;
}

const DAY_MS = 86_400_000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Extrait `[année, mois (0-based), jour]` de la partie date d'une chaîne ISO. */
function dateParts(value: string): [number, number, number] | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return [y, mo - 1, d];
}

/** Semaine ISO à partir d'une date `YYYY-MM-DD` (ou d'un timestamp ISO). */
export function isoWeekFromDate(value: string): IsoWeek | null {
  const parts = dateParts(value);
  if (!parts) return null;
  const [y, mo, d] = parts;

  // Jeudi de la semaine ISO courante → détermine l'année et le n° de semaine.
  const date = new Date(Date.UTC(y, mo, d));
  const dow = date.getUTCDay() || 7; // 1 (lun) … 7 (dim)
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - dow);
  const isoYear = thursday.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / DAY_MS + 1) / 7);

  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - (dow - 1));

  return {
    iso: `${isoYear}-W${pad2(week)}`,
    isoYear,
    week,
    monday: monday.toISOString().slice(0, 10),
  };
}

/** Lundi (`YYYY-MM-DD`) de la semaine ISO `YYYY-Www`. */
export function mondayOfIsoWeek(isoYear: number, week: number): string {
  // Le 4 janvier appartient toujours à la semaine 1 ISO.
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (dow - 1));
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday.toISOString().slice(0, 10);
}

/**
 * Normalise une valeur de semaine issue de l'Excel vers une clé ISO stable.
 * Accepte : `2026-W12`, `2026-w12`, `W12`/`S12`/`12` (année de repli), ou une
 * date `YYYY-MM-DD` / `DD/MM/YYYY` (on en déduit la semaine ISO).
 */
export function parseSemaine(raw: string, fallbackYear: number): IsoWeek | null {
  const value = raw.trim();
  if (!value) return null;

  // Forme `YYYY-Www` (ou `YYYY-Sww`).
  const full = value.match(/^(\d{4})[-\s]?[WwSs](\d{1,2})$/);
  if (full) {
    const isoYear = Number(full[1]);
    const week = Number(full[2]);
    if (week >= 1 && week <= 53) {
      return {
        iso: `${isoYear}-W${pad2(week)}`,
        isoYear,
        week,
        monday: mondayOfIsoWeek(isoYear, week),
      };
    }
  }

  // Forme `Www` / `Sww` / `ww` seule → année de repli.
  const weekOnly = value.match(/^[WwSs]?(\d{1,2})$/);
  if (weekOnly) {
    const week = Number(weekOnly[1]);
    if (week >= 1 && week <= 53) {
      return {
        iso: `${fallbackYear}-W${pad2(week)}`,
        isoYear: fallbackYear,
        week,
        monday: mondayOfIsoWeek(fallbackYear, week),
      };
    }
  }

  // Date ISO `YYYY-MM-DD…`.
  const iso = isoWeekFromDate(value);
  if (iso) return iso;

  // Date `DD/MM/YYYY` ou `DD-MM-YYYY`.
  const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const d = pad2(Number(dmy[1]));
    const mo = pad2(Number(dmy[2]));
    return isoWeekFromDate(`${dmy[3]}-${mo}-${d}`);
  }

  return null;
}
