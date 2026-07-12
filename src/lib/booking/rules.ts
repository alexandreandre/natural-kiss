/**
 * Règles métier **pures** du booking (M4, Brique 9) — sans base ni réseau,
 * donc entièrement testables :
 *   • génération du dossier de réservation (texte standardisé, copiable vers
 *     n'importe quel canal — email, portail transporteur, note d'appel) ;
 *   • génération de la référence de lot créée à la confirmation.
 *
 * Principe de cadrage : le CANAL de réservation est très variable (transporteur
 * direct, broker, transitaire, téléphone…) — on ne l'automatise pas, on le
 * simplifie. Les infos nécessaires sont toujours les mêmes ; c'est ce texte
 * qu'on standardise ici.
 */

export interface DossierBookingInput {
  clientNom: string;
  produit: string;
  variete: string | null;
  quantite: number | null;
  unite: string | null;
  incoterm: string | null;
  destinationPays: string | null;
  destinationPort: string | null;
  mode: string;
  dateSouhaitee: string | null;
}

/** Construit le dossier de réservation : un brief unique, quel que soit le canal de destination. */
export function generateDossierText(input: DossierBookingInput): string {
  const lignes: string[] = [
    "DOSSIER DE RÉSERVATION — NATURAL KISS",
    "",
    `Client : ${input.clientNom}`,
    `Produit : ${input.produit}${input.variete ? ` (${input.variete})` : ""}`,
  ];

  if (input.quantite != null) {
    lignes.push(`Quantité : ${input.quantite}${input.unite ? ` ${input.unite}` : ""}`);
  }
  if (input.incoterm) lignes.push(`Incoterm : ${input.incoterm}`);

  const destination = [input.destinationPort, input.destinationPays]
    .filter(Boolean)
    .join(", ");
  if (destination) lignes.push(`Destination : ${destination}`);

  lignes.push(`Mode de transport souhaité : ${modeLabel(input.mode)}`);
  if (input.dateSouhaitee) lignes.push(`Date de départ souhaitée : ${input.dateSouhaitee}`);

  lignes.push("", "Merci de confirmer : n° de conteneur, transporteur, date de départ.");

  return lignes.join("\n");
}

function modeLabel(mode: string): string {
  switch (mode) {
    case "sea":
      return "Maritime";
    case "roro":
      return "RoRo";
    case "air":
      return "Aérien";
    case "road":
      return "Routier";
    default:
      return mode;
  }
}

/** Prochaine référence de lot pour l'année donnée, à partir du dernier numéro connu. */
export function nextLotReference(year: number, lastSeq: number): string {
  const seq = lastSeq + 1;
  return `LOT-${year}-${String(seq).padStart(4, "0")}`;
}

/** Extrait le numéro de séquence d'une référence `LOT-YYYY-NNNN` de l'année donnée (sinon 0). */
export function parseLotSeq(reference: string, year: number): number {
  const m = reference.match(new RegExp(`^LOT-${year}-(\\d+)$`));
  return m ? Number(m[1]) : 0;
}
