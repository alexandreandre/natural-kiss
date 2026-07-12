import "server-only";

import { getSensorProvider } from "@/lib/adapters";
import { REQUIRED_DOC_TYPES } from "@/lib/gate/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  detectDelayAlert,
  detectExcursionAlert,
  detectMissingDocumentAlert,
  detectQuarantineRiskAlert,
  type AlerteCandidate,
  type AlerteSeverite,
  type AlerteType,
} from "@/lib/alertes/rules";

const ALL_TYPES: AlerteType[] = [
  "retard_navire",
  "excursion_temperature",
  "document_manquant",
  "risque_quarantaine",
];

const QUARANTINE_RULES = new Set(["declaration_additionnelle_ue", "reglement_2021_2285"]);

/**
 * Scanne un lot : recalcule les 4 familles d'alertes (retard, excursion,
 * document manquant, risque de quarantaine) à partir de `TrackingProvider` /
 * `SensorProvider` / de la Gate (M6, déjà persistée), puis upsert dans
 * `alertes` (idempotent, une ligne par type — modèle "replace on rerun").
 */
export async function runAlertScan(lotId: string): Promise<AlerteCandidate[]> {
  const supabase = createAdminClient();

  const { data: lot, error: lotErr } = await supabase
    .from("lots")
    .select("id, reference, numero_conteneur, statut, date_arrivee_prevue, date_arrivee_reelle, temperature_consigne_c")
    .eq("id", lotId)
    .maybeSingle();
  if (lotErr) throw new Error(`Lecture du lot impossible : ${lotErr.message}`);
  if (!lot) throw new Error(`Lot introuvable : ${lotId}`);

  const ref = lot.numero_conteneur ?? lot.reference;

  const [readings, docRows, conformiteRows] = await Promise.all([
    getSensorProvider().getSeries(ref),
    supabase.from("documents").select("type").eq("lot_id", lotId),
    supabase.from("conformite_checks").select("regle, libelle, statut").eq("lot_id", lotId),
  ]);
  if (docRows.error)
    throw new Error(`Lecture des documents impossible : ${docRows.error.message}`);
  if (conformiteRows.error) {
    throw new Error(
      `Lecture de la conformité impossible : ${conformiteRows.error.message}`,
    );
  }

  const presentTypes = new Set((docRows.data ?? []).map((d) => d.type));
  const missing = REQUIRED_DOC_TYPES.filter((t) => !presentTypes.has(t));

  const failingQuarantineRules = (conformiteRows.data ?? []).filter(
    (c) => QUARANTINE_RULES.has(c.regle) && (c.statut === "manquant" || c.statut === "non_conforme"),
  );

  const candidates: AlerteCandidate[] = [
    detectDelayAlert({
      statut: lot.statut,
      dateArriveePrevue: lot.date_arrivee_prevue,
      dateArriveeReelle: lot.date_arrivee_reelle,
    }),
    detectExcursionAlert({
      targetTempC: lot.temperature_consigne_c,
      readings: readings.map((r) => ({ tempC: r.tempC })),
    }),
    detectMissingDocumentAlert({ missing }),
    detectQuarantineRiskAlert({
      failingRules: failingQuarantineRules.map((r) => ({ regle: r.regle, libelle: r.libelle })),
    }),
  ].filter((c): c is AlerteCandidate => c !== null);

  const byType = new Map(candidates.map((c) => [c.type, c]));

  for (const type of ALL_TYPES) {
    const candidate = byType.get(type);
    if (candidate) {
      const { error } = await supabase.from("alertes").upsert(
        {
          lot_id: lotId,
          type,
          severite: candidate.severite as AlerteSeverite,
          statut: "active",
          message: candidate.message,
          valeur_mesuree: candidate.valeurMesuree,
          detectee_le: new Date().toISOString(),
          resolue_le: null,
        },
        { onConflict: "lot_id,type" },
      );
      if (error) throw new Error(`Écriture de l'alerte impossible : ${error.message}`);
    } else {
      const { error } = await supabase
        .from("alertes")
        .update({ statut: "resolue", resolue_le: new Date().toISOString() })
        .eq("lot_id", lotId)
        .eq("type", type)
        .eq("statut", "active");
      if (error) throw new Error(`Résolution de l'alerte impossible : ${error.message}`);
    }
  }

  return candidates;
}

/** Scanne tous les lots actifs (hors clôturés/rejetés). */
export async function runAlertScanAll(): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lots")
    .select("id")
    .not("statut", "in", "(cloture)");
  if (error) throw new Error(`Lecture des lots impossible : ${error.message}`);

  for (const lot of data ?? []) {
    await runAlertScan(lot.id);
  }
}

type AlerteRow = Database["public"]["Tables"]["alertes"]["Row"];

export interface AlerteOverviewRow {
  id: string;
  lotId: string;
  reference: string;
  produit: string;
  clientNom: string | null;
  type: AlerteType;
  severite: AlerteSeverite;
  statut: AlerteRow["statut"];
  message: string;
  detecteeLe: string;
}

const SEVERITY_ORDER: Record<AlerteSeverite, number> = { critique: 0, avertissement: 1, info: 2 };

/** Alertes actives, tous lots confondus (page d'aperçu /alertes). */
export async function listActiveAlertes(): Promise<AlerteOverviewRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("alertes")
    .select("id, type, severite, statut, message, detectee_le, lot:lots(id, reference, produit, client:clients(nom))")
    .eq("statut", "active");
  if (error) throw new Error(`Lecture des alertes impossible : ${error.message}`);

  return (data ?? [])
    .map((a) => {
      const lot = a.lot as {
        id: string;
        reference: string;
        produit: string;
        client: { nom: string } | null;
      } | null;
      return {
        id: a.id,
        lotId: lot?.id ?? "",
        reference: lot?.reference ?? "—",
        produit: lot?.produit ?? "—",
        clientNom: lot?.client?.nom ?? null,
        type: a.type,
        severite: a.severite,
        statut: a.statut,
        message: a.message,
        detecteeLe: a.detectee_le,
      };
    })
    .sort((a, b) => SEVERITY_ORDER[a.severite] - SEVERITY_ORDER[b.severite]);
}

/** Alertes d'un lot (actives + résolues récemment), pour l'onglet de la fiche lot. */
export async function getLotAlertes(lotId: string): Promise<AlerteOverviewRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("alertes")
    .select("id, type, severite, statut, message, detectee_le, lot:lots(id, reference, produit)")
    .eq("lot_id", lotId)
    .order("detectee_le", { ascending: false });
  if (error) throw new Error(`Lecture des alertes impossible : ${error.message}`);

  return (data ?? []).map((a) => {
    const lot = a.lot as { id: string; reference: string; produit: string } | null;
    return {
      id: a.id,
      lotId,
      reference: lot?.reference ?? "—",
      produit: lot?.produit ?? "—",
      clientNom: null,
      type: a.type,
      severite: a.severite,
      statut: a.statut,
      message: a.message,
      detecteeLe: a.detectee_le,
    };
  });
}
