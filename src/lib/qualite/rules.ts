import type {
  QcCategorie,
  QcDefaut,
  QcSeverite,
  QcVerdict,
} from "@/lib/adapters/types";

/**
 * Règles métier **pures** de la boucle qualité (Brique 6) — sans base ni réseau,
 * donc entièrement testables :
 *   • rattachement mail → lot (extraction des références du sujet / nom de PDF) ;
 *   • dérivation du verdict à partir du score et des défauts (repli mock/LLM) ;
 *   • agrégation des tendances qualité par produit / client / site.
 *
 * L'extraction des défauts eux-mêmes est produite par le `QcAnalyzerProvider`
 * (adaptateur mock → LLM réel) ; ici on la consomme.
 */

// ── Rattachement mail → lot ──────────────────────────────────────────────────

// N° de conteneur ISO (3–4 lettres + 6/7 chiffres) ou réf. de lot interne. On
// évite `\b` : les noms de fichiers séparent souvent par « _ » (caractère de
// mot), qui neutraliserait la limite (ex. « BR41239_CAAU4027760_QR.pdf »).
const CONTAINER_RE = /[A-Z]{3,4}\d{6,7}/g;
const LOT_REF_RE = /LOT-\d{4}-\d{4}/g;

/**
 * Extrait les références candidates (n° de conteneur, réf. de lot) d'un texte
 * libre — typiquement le sujet du mail concaténé au nom du fichier joint.
 */
export function extractRefs(text: string): string[] {
  const up = (text ?? "").toUpperCase();
  const found = [...(up.match(CONTAINER_RE) ?? []), ...(up.match(LOT_REF_RE) ?? [])];
  return [...new Set(found)];
}

export interface LotRef {
  id: string;
  reference: string;
  numeroConteneur: string | null;
}

/**
 * Résout le lot d'un retour à partir des références extraites du mail. Match
 * exact (insensible à la casse) sur le n° de conteneur puis la référence de lot.
 * Renvoie l'`id` du lot ou `null` si aucun (ou plusieurs) ne correspond.
 */
export function matchLot(refs: string[], lots: LotRef[]): string | null {
  const wanted = new Set(refs.map((r) => r.toUpperCase()));
  const matches = lots.filter(
    (l) =>
      (l.numeroConteneur && wanted.has(l.numeroConteneur.toUpperCase())) ||
      wanted.has(l.reference.toUpperCase()),
  );
  const ids = new Set(matches.map((m) => m.id));
  return ids.size === 1 ? [...ids][0]! : null;
}

// ── Verdict dérivé (repli / cohérence) ───────────────────────────────────────

const SEVERITE_RANK: Record<QcSeverite, number> = {
  mineur: 0,
  majeur: 1,
  critique: 2,
};

/** Sévérité la plus élevée parmi les défauts (null si aucun défaut). */
export function worstSeverite(
  defauts: Pick<QcDefaut, "severite">[],
): QcSeverite | null {
  let worst: QcSeverite | null = null;
  for (const d of defauts) {
    if (worst === null || SEVERITE_RANK[d.severite] > SEVERITE_RANK[worst]) {
      worst = d.severite;
    }
  }
  return worst;
}

/**
 * Dérive un verdict qualité du score et des défauts — logique de repli utilisée
 * pour les PDF hors fixtures (le mock/LLM peut fournir son propre verdict) :
 *   • un défaut critique ⇒ rouge ;
 *   • score < 85 ⇒ rouge ;
 *   • un défaut majeur ou score < 90 ⇒ orange ;
 *   • sinon vert.
 */
export function verdictForScore(
  score: number | null,
  defauts: Pick<QcDefaut, "severite">[],
): QcVerdict {
  const worst = worstSeverite(defauts);
  if (worst === "critique") return "rouge";
  if (score !== null && score < 85) return "rouge";
  if (worst === "majeur" || (score !== null && score < 90)) return "orange";
  return "vert";
}

// ── Tendances qualité (agrégation par produit / client / site) ───────────────

export interface QcTrendReport {
  produit: string;
  clientNom: string | null;
  site: string | null;
  verdict: QcVerdict;
  score: number | null;
  defauts: {
    code: string;
    libelle: string;
    categorie: QcCategorie;
    severite: QcSeverite;
  }[];
}

export interface DefautCount {
  code: string;
  libelle: string;
  count: number;
}

export interface TrendGroup {
  key: string;
  total: number;
  vert: number;
  orange: number;
  rouge: number;
  scoreMoyen: number | null;
  topDefauts: DefautCount[];
}

export interface QualiteTrends {
  total: number;
  byProduit: TrendGroup[];
  byClient: TrendGroup[];
  bySite: TrendGroup[];
  topDefauts: DefautCount[];
}

function tallyDefauts(reports: QcTrendReport[]): DefautCount[] {
  const counts = new Map<string, DefautCount>();
  for (const r of reports) {
    for (const d of r.defauts) {
      const existing = counts.get(d.code);
      if (existing) existing.count += 1;
      else counts.set(d.code, { code: d.code, libelle: d.libelle, count: 1 });
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.libelle.localeCompare(b.libelle),
  );
}

function groupBy(
  reports: QcTrendReport[],
  keyOf: (r: QcTrendReport) => string | null,
): TrendGroup[] {
  const buckets = new Map<string, QcTrendReport[]>();
  for (const r of reports) {
    const key = keyOf(r);
    if (!key) continue;
    const arr = buckets.get(key);
    if (arr) arr.push(r);
    else buckets.set(key, [r]);
  }

  const groups: TrendGroup[] = [];
  for (const [key, rows] of buckets) {
    const scores = rows.map((r) => r.score).filter((s): s is number => s !== null);
    groups.push({
      key,
      total: rows.length,
      vert: rows.filter((r) => r.verdict === "vert").length,
      orange: rows.filter((r) => r.verdict === "orange").length,
      rouge: rows.filter((r) => r.verdict === "rouge").length,
      scoreMoyen:
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null,
      topDefauts: tallyDefauts(rows).slice(0, 4),
    });
  }

  // Les groupes les plus « à problème » d'abord (rouge, puis volume).
  return groups.sort(
    (a, b) => b.rouge - a.rouge || b.total - a.total || a.key.localeCompare(b.key),
  );
}

/** Agrège une liste de rapports qualité en tendances par produit/client/site. */
export function aggregateTrends(reports: QcTrendReport[]): QualiteTrends {
  return {
    total: reports.length,
    byProduit: groupBy(reports, (r) => r.produit),
    byClient: groupBy(reports, (r) => r.clientNom),
    bySite: groupBy(reports, (r) => r.site),
    topDefauts: tallyDefauts(reports).slice(0, 8),
  };
}
