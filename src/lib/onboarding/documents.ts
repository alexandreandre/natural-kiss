/**
 * Générateur de documents d'onboarding (M2) — logique **pure** (aucune I/O),
 * donc testable. Produit des gabarits HTML simples (MVP) : le contenu exact
 * sera précisé avec le client après la démo. Les champs issus de la demande sont
 * échappés (pas d'injection HTML).
 */

export type OnboardingDocumentType = "bienvenue" | "certifs" | "produit";

export interface OnboardingDocumentInput {
  clientNom: string;
  produit: string;
  paysCode: string;
  /** Libellés des certifications couvertes (déjà lisibles, ex. "GlobalG.A.P."). */
  certifsLabels: string[];
  /** Lien d'accès au portail (défaut : la page de connexion). */
  portailUrl?: string;
}

export interface OnboardingDocumentDraft {
  type: OnboardingDocumentType;
  titre: string;
  contenuHtml: string;
}

const PORTAIL_URL_DEFAUT = "/portail/login";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildOnboardingDocuments(
  input: OnboardingDocumentInput,
): OnboardingDocumentDraft[] {
  const nom = escapeHtml(input.clientNom);
  const produit = escapeHtml(input.produit);
  const pays = escapeHtml(input.paysCode);
  const portail = escapeHtml(input.portailUrl ?? PORTAIL_URL_DEFAUT);
  const certifsList = input.certifsLabels.length
    ? `<ul>${input.certifsLabels.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>`
    : "<p>—</p>";

  return [
    {
      type: "bienvenue",
      titre: `Bienvenue chez Natural Kiss — ${nom}`,
      contenuHtml:
        `<h1>Bienvenue, ${nom}</h1>` +
        `<p>Nous sommes ravis de démarrer notre collaboration pour ${produit} → ${pays}.</p>` +
        `<p>Votre espace client est désormais actif : vous pourrez y suivre vos lots, ` +
        `documents et statuts en temps réel.</p>` +
        `<p><strong>Accès à votre espace&nbsp;:</strong> ${portail}</p>` +
        `<p>À très bientôt,<br/>L'équipe Natural Kiss</p>`,
    },
    {
      type: "certifs",
      titre: "Nos certifications",
      contenuHtml:
        `<h1>Certifications Natural Kiss</h1>` +
        `<p>Certifications couvrant ${produit} → ${pays}&nbsp;:</p>` +
        certifsList +
        `<p>Les attestations complètes sont disponibles sur demande.</p>`,
    },
    {
      type: "produit",
      titre: `Fiche produit & prochaines étapes — ${produit}`,
      contenuHtml:
        `<h1>${produit} → ${pays}</h1>` +
        `<h2>Prochaines étapes</h2>` +
        `<ol>` +
        `<li>Validation des spécifications produit.</li>` +
        `<li>Planification du premier envoi (booking).</li>` +
        `<li>Suivi du lot dans votre espace client.</li>` +
        `</ol>` +
        `<p>Ce document est un gabarit de démonstration — le contenu final sera ` +
        `précisé avec vous.</p>`,
    },
  ];
}
