# MVP « Demande → Certifs → Onboarding → Espace client » — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Compléter la Brique 7 (Demande & Onboarding) pour démontrer le flow de bout en bout à Valentin & Nico : une page publique où le client soumet une demande produit×pays, le matching des certifs existant, puis un onboarding qui **génère des documents templates**, les **« envoie » par email (mock, visible)**, et enrichit l'**espace client** avec ces documents.

**Architecture:** Extension d'une base existante et fonctionnelle. On ne réécrit rien du moteur de matching (`src/lib/onboarding/rules.ts`) ni du portail RLS (Brique 4). On ajoute : (1) une migration `0010` avec deux tables (`documents_onboarding` client-scopée + RLS, `emails_envoyes` interne) ; (2) un générateur de documents **pur** ; (3) l'extension de `onboardDemande()` (génère docs + email d'onboarding) et de `createDemande()`/`getOnboardingOverview()` (journalise les emails) ; (4) une lecture portail des documents + une page de rendu ; (5) une page publique `/nouvelle-demande` ; (6) un panneau « Emails envoyés » interne.

**Tech Stack:** Next.js 16 (App Router, Server Components + Server Actions), TypeScript strict, Tailwind v4 + shadcn/ui, Supabase (Postgres + Auth + Storage + RLS) via `supabase-js` typé, next-intl (FR/EN), Vitest (unit + intégration), Playwright (e2e). Adaptateurs mock-first (`EmailProvider`).

---

## ⚙️ Préambule environnement (À LIRE AVANT DE COMMENCER)

- **Docker n'est pas disponible** sur la machine → `supabase start` / `npm run db` local **ne fonctionnent pas**.
- `.env.local` pointe sur un **projet Supabase CLOUD** (`ref = lpavhkdxewllllmzzgug`). Les tests d'intégration existants tournent déjà contre ce cloud (via `createAdminClient()` qui lit `.env.local`). **C'est le mode de dev de ce poste.**
- Conséquence : la migration `0010` s'applique au **cloud**, et les types se régénèrent depuis le **cloud**.

**Charger les variables d'environnement pour la CLI Supabase** (à faire une fois par shell) :
```bash
set -a; source .env.local; set +a
export SUPABASE_DB_PASSWORD="$DB_PASSWORD"   # la CLI attend SUPABASE_DB_PASSWORD
```

**Appliquer une migration au cloud** (méthode repo, cf. README §9) :
```bash
supabase link --project-ref lpavhkdxewllllmzzgug   # idempotent ; SUPABASE_ACCESS_TOKEN vient de .env.local
supabase db push                                    # applique supabase/migrations/*.sql
```
> Fallback si `db push` pose problème (connexion directe port 5432) :
> ```bash
> psql "postgresql://postgres:$DB_PASSWORD@db.lpavhkdxewllllmzzgug.supabase.co:5432/postgres" \
>   -f supabase/migrations/0010_documents_onboarding.sql
> ```
> Alternative locale (si un jour Docker est présent) : `npm run db:reset` puis `npm run types`.

**Régénérer les types depuis le cloud :**
```bash
npm run types:cloud    # supabase gen types typescript --linked --schema public > src/lib/supabase/types.ts
```

**Commits :** le repo est sur `main`. **Créer une branche d'abord** (Task 0). Messages de commit **en français** (convention repo). Terminer chaque message par la ligne `Co-Authored-By: …` requise.

**Vérification qualité (rappel des commandes) :**
```bash
npm run lint && npm run typecheck && npm run format:check
npm test                     # Vitest (unit + intégration, contre le cloud)
npm run test:e2e             # Playwright
```

---

## Task 0 : Branche de travail

**Step 1 — Créer la branche**
```bash
git checkout -b feat/demande-onboarding-mvp
```
**Step 2 — Vérifier l'état propre**
```bash
git status    # doit inclure les 2 fichiers docs/plans déjà écrits (design + ce plan), non commités
```
**Step 3 — Commit du design + plan**
```bash
git add docs/plans/2026-07-12-demande-onboarding-mvp-design.md docs/plans/2026-07-12-demande-onboarding-mvp-plan.md
git commit -m "docs(demande): design & plan du MVP demande→onboarding→espace client"
```

---

## Task 1 : Migration DB `0010` + types

**Files:**
- Create: `supabase/migrations/0010_documents_onboarding.sql`
- Modify (généré) : `src/lib/supabase/types.ts`

**Step 1 — Écrire la migration**

Créer `supabase/migrations/0010_documents_onboarding.sql` :
```sql
-- ============================================================================
-- Brique 7bis — Documents d'onboarding (client-scopés) + boîte d'envoi (démo)
-- ============================================================================
-- Complète M2 (onboarding) : à la création de l'espace client, la plateforme
-- génère des documents de bienvenue/certifs/produit LISIBLES par le client dans
-- son portail (RLS, même modèle que la Brique 4), et journalise les emails mock
-- (pack de présentation + onboarding) pour les rendre visibles côté interne.
--
--   • documents_onboarding : client-scopé, SELECT autorisé au client (portail) ;
--   • emails_envoyes       : INTERNE (deny RLS ; lu via service role sur /demande).
-- ============================================================================

-- ── Types énumérés ──────────────────────────────────────────────────────────
create type document_onboarding_type as enum ('bienvenue', 'certifs', 'produit');
create type email_categorie as enum ('pack_certif', 'onboarding');

-- ── Documents d'onboarding (lisibles par le client) ──────────────────────────
create table public.documents_onboarding (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  demande_id   uuid references public.demandes (id) on delete set null,
  type         document_onboarding_type not null,
  titre        text not null,
  contenu_html text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index documents_onboarding_client_id_idx on public.documents_onboarding (client_id);
-- Idempotence de l'onboarding : un document par (demande, type). Les lignes de
-- seed (demande_id NULL) restent distinctes (NULLs non contraints par un unique).
create unique index documents_onboarding_demande_type_uidx
  on public.documents_onboarding (demande_id, type);

comment on table public.documents_onboarding is
  'Documents d''onboarding (M2) générés à la création de l''espace client, '
  'lisibles par le client dans son portail (RLS, Brique 4).';

-- ── Journal des emails envoyés (démo — mock EmailProvider) ───────────────────
create table public.emails_envoyes (
  id         uuid primary key default gen_random_uuid(),
  categorie  email_categorie not null,
  to_email   text not null,
  subject    text not null,
  body       text not null,
  demande_id uuid references public.demandes (id) on delete set null,
  client_id  uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now()
);
create index emails_envoyes_created_at_idx on public.emails_envoyes (created_at desc);

comment on table public.emails_envoyes is
  'Journal (démo) des emails envoyés par la plateforme via le mock EmailProvider '
  '(pack de présentation + onboarding). Interne — non exposé au portail.';

-- ── Trigger updated_at (fonction définie en Brique 0) ────────────────────────
create trigger documents_onboarding_set_updated_at
  before update on public.documents_onboarding
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS — activée partout (deny par défaut). La service role contourne la RLS.
-- ============================================================================
alter table public.documents_onboarding enable row level security;
alter table public.emails_envoyes        enable row level security;

-- Le client LIT ses propres documents d'onboarding (même patron que Brique 4).
create policy documents_onboarding_select_portail
  on public.documents_onboarding for select to authenticated
  using (client_id in (select public.current_client_ids()));

-- emails_envoyes : AUCUNE policy → deny total pour anon/authenticated (interne).

-- ── Privilèges (convention Brique 0 : sécurité par RLS, pas par GRANT) ───────
grant select, insert, update, delete
  on public.documents_onboarding, public.emails_envoyes
  to anon, authenticated, service_role;
```

**Step 2 — Appliquer la migration au cloud**
```bash
set -a; source .env.local; set +a
export SUPABASE_DB_PASSWORD="$DB_PASSWORD"
supabase link --project-ref lpavhkdxewllllmzzgug
supabase db push
```
Expected : `Applying migration 0010_documents_onboarding.sql...` sans erreur.

**Step 3 — Régénérer les types**
```bash
npm run types:cloud
```
Expected : `src/lib/supabase/types.ts` modifié ; il contient désormais `documents_onboarding`, `emails_envoyes`, et les enums `document_onboarding_type`, `email_categorie`.

**Step 4 — Vérifier la compilation**
```bash
npm run typecheck
```
Expected : PASS (aucune référence cassée ; les nouvelles tables ne sont pas encore utilisées).

**Step 5 — Commit**
```bash
git add supabase/migrations/0010_documents_onboarding.sql src/lib/supabase/types.ts
git commit -m "feat(db): migration 0010 — documents_onboarding (RLS client) + emails_envoyes"
```

---

## Task 2 : Générateur de documents (logique pure, TDD)

**Files:**
- Create: `src/lib/onboarding/documents.ts`
- Test: `tests/unit/onboarding-documents.test.ts`

**Step 1 — Écrire le test qui échoue**

Créer `tests/unit/onboarding-documents.test.ts` :
```ts
import { describe, expect, it } from "vitest";

import { buildOnboardingDocuments } from "@/lib/onboarding/documents";

describe("buildOnboardingDocuments", () => {
  const base = {
    clientNom: "Barfoots of Botley Ltd",
    produit: "Brocoli / Tenderstem",
    paysCode: "UK",
    certifsLabels: ["GlobalG.A.P.", "GRASP", "BRCGS", "SMETA", "Sedex"],
  };

  it("génère les 3 documents (bienvenue, certifs, produit) dans l'ordre", () => {
    const docs = buildOnboardingDocuments(base);
    expect(docs.map((d) => d.type)).toEqual(["bienvenue", "certifs", "produit"]);
  });

  it("le document de bienvenue nomme le client et le lien portail", () => {
    const [bienvenue] = buildOnboardingDocuments(base);
    expect(bienvenue.titre).toContain("Barfoots of Botley Ltd");
    expect(bienvenue.contenuHtml).toContain("Barfoots of Botley Ltd");
    expect(bienvenue.contenuHtml).toContain("/portail/login");
  });

  it("le document certifs liste les certifications couvertes", () => {
    const certifs = buildOnboardingDocuments(base).find((d) => d.type === "certifs")!;
    expect(certifs.contenuHtml).toContain("GlobalG.A.P.");
    expect(certifs.contenuHtml).toContain("Sedex");
  });

  it("la fiche produit mentionne produit et pays", () => {
    const produit = buildOnboardingDocuments(base).find((d) => d.type === "produit")!;
    expect(produit.contenuHtml).toContain("Brocoli / Tenderstem");
    expect(produit.contenuHtml).toContain("UK");
  });

  it("échappe le HTML des entrées (pas d'injection via le nom)", () => {
    const docs = buildOnboardingDocuments({ ...base, clientNom: "<script>x</script>" });
    expect(docs[0].contenuHtml).not.toContain("<script>");
    expect(docs[0].contenuHtml).toContain("&lt;script&gt;");
  });
});
```

**Step 2 — Lancer le test (doit échouer)**
```bash
npm test -- onboarding-documents
```
Expected : FAIL — `Failed to resolve import "@/lib/onboarding/documents"`.

**Step 3 — Implémenter le module**

Créer `src/lib/onboarding/documents.ts` :
```ts
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
    .replace(/"/g, "&quot;");
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
      titre: `Bienvenue chez Natural Kiss — ${input.clientNom}`,
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
      titre: `Fiche produit & prochaines étapes — ${input.produit}`,
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
```

**Step 4 — Lancer le test (doit passer)**
```bash
npm test -- onboarding-documents
```
Expected : PASS (5 tests).

**Step 5 — Commit**
```bash
git add src/lib/onboarding/documents.ts tests/unit/onboarding-documents.test.ts
git commit -m "feat(onboarding): générateur pur des documents d'onboarding (templates MVP)"
```

---

## Task 3 : Service — journaliser les emails, générer les documents à l'onboarding

**Files:**
- Modify: `src/lib/onboarding/service.ts`
- Test: `tests/integration/onboarding-documents.test.ts` (create)

**Step 1 — Écrire le test d'intégration qui échoue**

Créer `tests/integration/onboarding-documents.test.ts` :
```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

import "@/lib/supabase/ensure-websocket";
import { createDemande, onboardDemande } from "@/lib/onboarding/service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

/**
 * Brique 7bis — génération des documents d'onboarding + journal des emails,
 * contre Supabase (coffre du seed). Vérifie : 3 documents créés, emails
 * journalisés (pack_certif + onboarding), et RLS (le client voit SES documents,
 * un autre client n'en voit aucun). Nettoie tout ce qui est créé.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const password = process.env.PORTAIL_DEMO_PASSWORD ?? "NaturalKiss!Demo2026";
const admin = createAdminClient();
const RUN = Date.now();

const created = { demandeId: "", clientId: "", userId: "" };

afterAll(async () => {
  if (created.demandeId) await admin.from("emails_envoyes").delete().eq("demande_id", created.demandeId);
  if (created.demandeId) await admin.from("demandes").delete().eq("id", created.demandeId);
  if (created.clientId) await admin.from("clients").delete().eq("id", created.clientId); // cascade docs + client_users
  if (created.userId) await admin.auth.admin.deleteUser(created.userId).catch(() => undefined);
});

describe("Onboarding — documents & emails (Supabase)", () => {
  it("brocoli → UK : onboarding génère 3 documents + journalise les emails", async () => {
    const email = `docs-${RUN}@example.com`;
    const demande = await createDemande({
      clientNom: `Docs Test ${RUN}`,
      contactEmail: email,
      produit: "Brocoli / Tenderstem",
      pays: "UK",
    });
    created.demandeId = demande.demandeId;
    expect(demande.match.decision).toBe("suffisant");

    // Email pack_certif journalisé par createDemande.
    const { data: packMails } = await admin
      .from("emails_envoyes")
      .select("categorie")
      .eq("demande_id", demande.demandeId)
      .eq("categorie", "pack_certif");
    expect((packMails ?? []).length).toBe(1);

    const onboard = await onboardDemande(demande.demandeId);
    created.clientId = onboard.clientId;
    created.userId = onboard.userId;
    expect(onboard.documentsCreated).toBe(3);

    // 3 documents en base pour ce client.
    const { data: docs } = await admin
      .from("documents_onboarding")
      .select("type, titre")
      .eq("client_id", onboard.clientId);
    expect((docs ?? []).map((d) => d.type).sort()).toEqual(["bienvenue", "certifs", "produit"]);

    // Email d'onboarding journalisé.
    const { data: onbMails } = await admin
      .from("emails_envoyes")
      .select("categorie")
      .eq("demande_id", demande.demandeId)
      .eq("categorie", "onboarding");
    expect((onbMails ?? []).length).toBe(1);
  });

  it("RLS : le client onboardé voit SES 3 documents", async () => {
    const c: SupabaseClient<Database> = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signErr } = await c.auth.signInWithPassword({
      email: `docs-${RUN}@example.com`,
      password,
    });
    expect(signErr).toBeNull();

    const { data, error } = await c.from("documents_onboarding").select("id, client_id");
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(3);
    expect((data ?? []).every((d) => d.client_id === created.clientId)).toBe(true);
  });

  it("RLS : un utilisateur anonyme ne voit aucun document", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await anon.from("documents_onboarding").select("id");
    expect(data ?? []).toHaveLength(0);
  });
});
```

**Step 2 — Lancer le test (doit échouer)**
```bash
npm test -- onboarding-documents.test
```
Expected : FAIL — `onboard.documentsCreated` est `undefined` et aucun email n'est journalisé.

**Step 3 — Étendre `service.ts`**

3a. Ajouter les imports en tête (après les imports existants) :
```ts
import { buildOnboardingDocuments } from "@/lib/onboarding/documents";
```
Et compléter le bloc de types depuis `Database` :
```ts
type EmailCategorie = Database["public"]["Enums"]["email_categorie"];
```

3b. Ajouter un helper de journalisation (juste avant `createDemande`) :
```ts
/** Journalise un email « envoyé » (mock) pour la boîte d'envoi démo. */
async function logEmailEnvoye(
  supabase: ReturnType<typeof createAdminClient>,
  row: {
    categorie: EmailCategorie;
    to: string;
    subject: string;
    body: string;
    demandeId?: string | null;
    clientId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("emails_envoyes").insert({
    categorie: row.categorie,
    to_email: row.to,
    subject: row.subject,
    body: row.body,
    demande_id: row.demandeId ?? null,
    client_id: row.clientId ?? null,
  });
  if (error) throw new Error(`Journalisation email impossible : ${error.message}`);
}
```

3c. Dans `createDemande`, remplacer le bloc d'envoi du pack (le `if (suffisant) { … }` autour des lignes 246-259) par une version qui construit sujet/corps, envoie **et journalise**. Le `demande_id` n'existe pas encore à ce stade → on journalise **après** l'insertion. Modifier ainsi :

Remplacer :
```ts
  // 1) Envoi automatique du pack (mock) au vert, avant persistance du timestamp.
  let mailSent = false;
  let packEnvoyeAt: string | null = null;
  if (suffisant) {
    const destinataire = input.contactEmail?.trim() || null;
    await getEmailProvider().send({
      to: destinataire ? [destinataire] : ["contact@natural-kiss.com"],
      subject: `Natural Kiss — pack de présentation & certifications (${input.produit} → ${match.paysCode})`,
      body:
        `Bonjour,\n\nSuite à votre demande (${input.produit} → ${match.paysCode}), ` +
        `veuillez trouver notre pack de présentation ainsi que nos certifications ` +
        `(${match.couvertes.map((t) => CERTIF_LABELS[t]).join(", ")}), toutes valides ` +
        `et couvrant ce produit / marché.\n\nBien cordialement,\nNatural Kiss`,
    });
    mailSent = true;
    packEnvoyeAt = new Date().toISOString();
  }
```
par :
```ts
  // 1) Envoi automatique du pack (mock) au vert, avant persistance du timestamp.
  const destinataire = input.contactEmail?.trim() || "contact@natural-kiss.com";
  const packSubject = `Natural Kiss — pack de présentation & certifications (${input.produit} → ${match.paysCode})`;
  const packBody =
    `Bonjour,\n\nSuite à votre demande (${input.produit} → ${match.paysCode}), ` +
    `veuillez trouver notre pack de présentation ainsi que nos certifications ` +
    `(${match.couvertes.map((t) => CERTIF_LABELS[t]).join(", ")}), toutes valides ` +
    `et couvrant ce produit / marché.\n\nBien cordialement,\nNatural Kiss`;
  let mailSent = false;
  let packEnvoyeAt: string | null = null;
  if (suffisant) {
    await getEmailProvider().send({ to: [destinataire], subject: packSubject, body: packBody });
    mailSent = true;
    packEnvoyeAt = new Date().toISOString();
  }
```
Puis, **après** l'insertion réussie de la demande (juste après `const demandeId = inserted.id;`), ajouter la journalisation du pack :
```ts
  if (suffisant) {
    await logEmailEnvoye(supabase, {
      categorie: "pack_certif",
      to: destinataire,
      subject: packSubject,
      body: packBody,
      demandeId,
      clientId: input.clientId ?? null,
    });
  }
```

3d. Étendre `OnboardResult` (ajouter le compteur de documents) :
```ts
export interface OnboardResult {
  clientId: string;
  userId: string;
  email: string;
  alreadyExisted: boolean;
  documentsCreated: number;
}
```

3e. Dans `onboardDemande`, élargir le `select` de la demande pour disposer du produit / pays / certifs :
Remplacer la ligne du select :
```ts
    .select(
      "id, client_id, client_nom, contact_email, pays, decision, espace_client_cree",
    )
```
par :
```ts
    .select(
      "id, client_id, client_nom, contact_email, produit, pays, decision, espace_client_cree, certifs_requises",
    )
```

3f. À la fin de `onboardDemande`, **avant** le `return`, insérer la génération des documents + l'email d'onboarding (idempotent : seulement si l'espace n'était pas déjà créé) :
```ts
  // 5) Documents d'onboarding + email (idempotent : une seule fois par demande).
  let documentsCreated = 0;
  if (!demande.espace_client_cree) {
    const drafts = buildOnboardingDocuments({
      clientNom: demande.client_nom,
      produit: demande.produit,
      paysCode: demande.pays,
      certifsLabels: demande.certifs_requises ?? [],
    });
    const { error: docErr } = await supabase
      .from("documents_onboarding")
      .upsert(
        drafts.map((d) => ({
          client_id: clientId,
          demande_id: demandeId,
          type: d.type,
          titre: d.titre,
          contenu_html: d.contenuHtml,
        })),
        { onConflict: "demande_id,type" },
      );
    if (docErr) throw new Error(`Création des documents impossible : ${docErr.message}`);
    documentsCreated = drafts.length;

    const onbSubject = "Natural Kiss — bienvenue & accès à votre espace client";
    const onbBody =
      `Bonjour,\n\nVotre espace client Natural Kiss est prêt. Vous y suivrez vos ` +
      `lots, documents et statuts.\n\nDocuments joints :\n` +
      drafts.map((d) => `• ${d.titre}`).join("\n") +
      `\n\nConnexion à votre espace : /portail/login\n\nBien cordialement,\nNatural Kiss`;
    await getEmailProvider().send({ to: [email], subject: onbSubject, body: onbBody });
    await logEmailEnvoye(supabase, {
      categorie: "onboarding",
      to: email,
      subject: onbSubject,
      body: onbBody,
      demandeId,
      clientId,
    });
  }

  return { clientId, userId, email, alreadyExisted, documentsCreated };
```
> ⚠️ Retirer l'ancien `return { clientId, userId, email, alreadyExisted };` remplacé ci-dessus.
> Note : l'étape « 4) Marque la demande onboardée » met `espace_client_cree=true` en base, mais l'objet `demande` en mémoire garde son ancienne valeur (`false` au premier passage) — la garde d'idempotence est donc correcte.

**Step 4 — Lancer le test (doit passer)**
```bash
npm test -- onboarding-documents.test
```
Expected : PASS (3 tests). Si `signInWithPassword` échoue, vérifier que `PORTAIL_DEMO_PASSWORD` est cohérent (défaut `NaturalKiss!Demo2026`).

**Step 5 — Vérifier la non-régression du test onboarding existant**
```bash
npm test -- onboarding
```
Expected : PASS (unit matching + intégration onboarding + documents).

**Step 6 — Commit**
```bash
git add src/lib/onboarding/service.ts tests/integration/onboarding-documents.test.ts
git commit -m "feat(onboarding): génère les documents + journalise les emails (pack & onboarding)"
```

---

## Task 4 : Aperçu interne — exposer la boîte d'envoi dans `getOnboardingOverview`

**Files:**
- Modify: `src/lib/onboarding/service.ts`

**Step 1 — Ajouter le type de ligne email et l'étendre à l'overview**

4a. Après l'interface `OnboardingOverview`, ajouter :
```ts
export interface EmailEnvoyeRow {
  id: string;
  categorie: EmailCategorie;
  toEmail: string;
  subject: string;
  createdAt: string;
}
```
Et compléter `OnboardingOverview` :
```ts
export interface OnboardingOverview {
  demandes: DemandeRow[];
  coffre: CoffreCertRow[];
  alertes: ExpirationAlert[];
  emails: EmailEnvoyeRow[];
}
```

4b. Dans `getOnboardingOverview`, ajouter la lecture des emails au `Promise.all` (4ᵉ requête) :
```ts
    supabase
      .from("emails_envoyes")
      .select("id, categorie, to_email, subject, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
```
en récupérant `emails` dans la déstructuration :
```ts
  const [certifs, demandes, taches, emails] = await Promise.all([ /* … */ ]);
```
et ajouter la garde d'erreur :
```ts
  if (emails.error)
    throw new Error(`Lecture des emails impossible : ${emails.error.message}`);
```

4c. Dans le `return`, ajouter le mapping :
```ts
    emails: (emails.data ?? []).map((e) => ({
      id: e.id,
      categorie: e.categorie,
      toEmail: e.to_email,
      subject: e.subject,
      createdAt: e.created_at,
    })),
```

**Step 2 — Vérifier la compilation**
```bash
npm run typecheck
```
Expected : PASS.

**Step 3 — Commit**
```bash
git add src/lib/onboarding/service.ts
git commit -m "feat(onboarding): expose les emails envoyés dans l'aperçu interne"
```

---

## Task 5 : Lecture portail des documents + page de rendu

**Files:**
- Modify: `src/lib/portail/data.ts`
- Create: `src/app/portail/documents/[id]/page.tsx`
- Modify: `src/app/portail/page.tsx`
- Modify: `src/i18n/messages/fr.json`, `src/i18n/messages/en.json`

**Step 1 — Ajouter les lectures RLS dans `portail/data.ts`**

Ajouter à la fin de `src/lib/portail/data.ts` :
```ts
export interface PortailOnboardingDoc {
  id: string;
  type: Database["public"]["Enums"]["document_onboarding_type"];
  titre: string;
  createdAt: string;
}

/** Documents d'onboarding du client connecté (RLS : uniquement les siens). */
export async function listMyDocuments(): Promise<PortailOnboardingDoc[]> {
  const supabase = await createServerAnonClient();
  const { data, error } = await supabase
    .from("documents_onboarding")
    .select("id, type, titre, created_at")
    .order("type", { ascending: true });
  if (error) throw new Error(`Lecture des documents impossible : ${error.message}`);
  return (data ?? []).map((d) => ({
    id: d.id,
    type: d.type,
    titre: d.titre,
    createdAt: d.created_at,
  }));
}

export interface PortailOnboardingDocDetail extends PortailOnboardingDoc {
  contenuHtml: string;
}

/** Un document d'onboarding du client connecté (RLS). `null` si inaccessible. */
export async function getMyDocument(
  id: string,
): Promise<PortailOnboardingDocDetail | null> {
  const supabase = await createServerAnonClient();
  const { data, error } = await supabase
    .from("documents_onboarding")
    .select("id, type, titre, contenu_html, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Lecture du document impossible : ${error.message}`);
  return data
    ? {
        id: data.id,
        type: data.type,
        titre: data.titre,
        contenuHtml: data.contenu_html,
        createdAt: data.created_at,
      }
    : null;
}
```

**Step 2 — Ajouter les clés i18n**

Dans `src/i18n/messages/fr.json`, à l'intérieur de l'objet `"portail"` (par ex. après la clé `"notFound"`), ajouter :
```json
    "documentsTitle": "Vos documents",
    "documentsEmpty": "Aucun document pour l'instant.",
    "documentType": {
      "bienvenue": "Bienvenue",
      "certifs": "Certifications",
      "produit": "Fiche produit"
    },
    "documentPrint": "Imprimer / PDF",
```
Dans `src/i18n/messages/en.json`, même emplacement dans `"portail"` :
```json
    "documentsTitle": "Your documents",
    "documentsEmpty": "No document yet.",
    "documentType": {
      "bienvenue": "Welcome",
      "certifs": "Certifications",
      "produit": "Product sheet"
    },
    "documentPrint": "Print / PDF",
```
> ⚠️ Vérifier les virgules JSON (ajouter une virgule après la clé précédente).

**Step 3 — Créer la page de rendu du document**

Créer `src/app/portail/documents/[id]/page.tsx` :
```tsx
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isFeatureEnabled } from "@/lib/feature-flags";
import { getMyDocument } from "@/lib/portail/data";
import { requirePortailContext } from "@/lib/portail/session";

export const dynamic = "force-dynamic";

export default async function PortailDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isFeatureEnabled("PORTAIL")) notFound();

  await requirePortailContext();
  const { id } = await params;
  const t = await getTranslations("portail");
  const doc = await getMyDocument(id);

  return (
    <div className="space-y-6">
      <Link
        href="/portail"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        {t("backToLots")}
      </Link>

      {!doc ? (
        <div className="border-border rounded-[4px] border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">{t("notFound")}</p>
        </div>
      ) : (
        <article className="border-border rounded-[4px] border p-6 sm:p-8">
          {/* Contenu généré par nos propres gabarits (documents.ts) — pas d'entrée
              utilisateur libre non échappée : rendu HTML sûr. */}
          <div
            className="prose-nk max-w-none text-sm leading-relaxed [&_h1]:font-display [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-medium [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-medium [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:mb-2.5 [&_ul]:my-2"
            dangerouslySetInnerHTML={{ __html: doc.contenuHtml }}
          />
        </article>
      )}
    </div>
  );
}
```

**Step 4 — Ajouter la section « Vos documents » sur l'accueil du portail**

Dans `src/app/portail/page.tsx` :
- ajouter l'import : `import { listMyLots, listMyDocuments } from "@/lib/portail/data";` (remplace l'import `listMyLots` existant) ;
- ajouter `import { FileText } from "lucide-react";` à la ligne d'import lucide existante (`ArrowUpRight, PackageSearch, FileText`) ;
- après `const lots = await listMyLots();` ajouter `const docs = await listMyDocuments();` ;
- insérer une nouvelle `<section>` **après** la section des lots (avant la fermeture du `</div>` racine) :
```tsx
      <section className="mt-10">
        <h2 className="text-muted-foreground/70 mb-3 font-mono text-[10px] tracking-[0.14em] uppercase">
          {t("documentsTitle")}
        </h2>
        {docs.length === 0 ? (
          <div className="border-border rounded-[4px] border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm">{t("documentsEmpty")}</p>
          </div>
        ) : (
          <ul className="divide-border/60 border-border divide-y rounded-[4px] border">
            {docs.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/portail/documents/${d.id}`}
                  className="hover:bg-accent/40 flex items-center gap-3 px-4 py-3.5 transition-colors"
                >
                  <FileText className="text-muted-foreground/70 size-4 shrink-0" />
                  <span className="text-sm font-medium">{d.titre}</span>
                  <span className="text-muted-foreground/60 ml-auto font-mono text-[10px] tracking-[0.12em] uppercase">
                    {t(`documentType.${d.type}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
```

**Step 5 — Vérifier compilation + non-régression portail**
```bash
npm run typecheck && npm test -- portail
```
Expected : PASS.

**Step 6 — Commit**
```bash
git add src/lib/portail/data.ts "src/app/portail/documents/[id]/page.tsx" src/app/portail/page.tsx src/i18n/messages/fr.json src/i18n/messages/en.json
git commit -m "feat(portail): section « Vos documents » + page de rendu (RLS)"
```

---

## Task 6 : Panneau « Emails envoyés » sur la page interne `/demande`

**Files:**
- Modify: `src/app/demande/page.tsx`
- Modify: `src/i18n/messages/fr.json`, `src/i18n/messages/en.json`

**Step 1 — Clés i18n**

Dans `fr.json`, à l'intérieur de `"demande"` (après le sous-objet `"coffre"`), ajouter :
```json
    ,"outbox": {
      "title": "Emails envoyés (démo)",
      "subtitle": "Journal des envois automatiques (mock) : pack de présentation et onboarding.",
      "empty": "Aucun email envoyé pour l'instant.",
      "categorie": {
        "pack_certif": "Pack certifications",
        "onboarding": "Onboarding"
      }
    }
```
> ⚠️ Insérer correctement : `"coffre"` se termine par `}` — ajouter `,` puis la clé `"outbox"`. Vérifier que l'objet `"demande"` reste du JSON valide.

Dans `en.json`, même emplacement :
```json
    ,"outbox": {
      "title": "Sent emails (demo)",
      "subtitle": "Log of automatic (mock) sends: presentation pack and onboarding.",
      "empty": "No email sent yet.",
      "categorie": {
        "pack_certif": "Certification pack",
        "onboarding": "Onboarding"
      }
    }
```

**Step 2 — Rendre le panneau**

Dans `src/app/demande/page.tsx` :
- ajouter `Mail` à l'import lucide : `import { BellRing, Mail, ShieldCheck } from "lucide-react";` ;
- récupérer `emails` : `const { demandes, coffre, alertes, emails } = await getOnboardingOverview();` ;
- ajouter une `<section>` **après** la section « Coffre certifications » (juste avant la fermeture `</div>` racine) :
```tsx
      {/* ── Emails envoyés (démo) ────────────────────────────────────── */}
      <section>
        <h2 className="font-display flex items-center gap-2 text-xl font-medium tracking-tight">
          <Mail className="text-primary size-5" />
          {t("demande.outbox.title")}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("demande.outbox.subtitle")}
        </p>
        {emails.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            {t("demande.outbox.empty")}
          </p>
        ) : (
          <ul className="divide-border/60 border-border mt-4 divide-y rounded-[4px] border">
            {emails.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="border-primary/25 bg-primary/5 text-primary rounded-[3px] border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase">
                  {t(`demande.outbox.categorie.${e.categorie}`)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{e.subject}</span>
                <span className="text-muted-foreground/70 truncate font-mono text-[11px]">
                  {e.toEmail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
```

**Step 3 — Vérifier**
```bash
npm run typecheck
```
Expected : PASS.

**Step 4 — Commit**
```bash
git add src/app/demande/page.tsx src/i18n/messages/fr.json src/i18n/messages/en.json
git commit -m "feat(demande): panneau « Emails envoyés (démo) » sur la page interne"
```

---

## Task 7 : Page publique client `/nouvelle-demande`

**Files:**
- Modify: `src/lib/onboarding/actions.ts`
- Create: `src/components/onboarding/public-demande-form.tsx`
- Create: `src/app/nouvelle-demande/page.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/i18n/messages/fr.json`, `src/i18n/messages/en.json`

**Step 1 — Server action publique (neutre)**

Dans `src/lib/onboarding/actions.ts`, ajouter à la fin :
```ts
export interface PublicDemandeActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Soumission publique d'une demande (page client `/nouvelle-demande`). Réutilise
 * le matching interne mais ne renvoie qu'une confirmation neutre : le résultat du
 * matching reste côté interne (l'équipe NK valide avant l'onboarding).
 */
export async function submitPublicDemandeAction(
  formData: FormData,
): Promise<PublicDemandeActionResult> {
  const clientNom = String(formData.get("clientNom") ?? "").trim();
  const produit = String(formData.get("produit") ?? "").trim();
  const pays = String(formData.get("pays") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
  const volume = String(formData.get("volume") ?? "").trim() || null;

  if (!clientNom || !produit || !pays) {
    return { ok: false, error: "Société, produit et pays sont requis." };
  }

  try {
    await createDemande({ clientNom, produit, pays, contactEmail, volume });
    revalidatePath("/demande");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
}
```

**Step 2 — Formulaire client**

Créer `src/components/onboarding/public-demande-form.tsx` :
```tsx
"use client";

import { CheckCircle2, Loader2, Send, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { submitPublicDemandeAction } from "@/lib/onboarding/actions";

const FIELD =
  "border-border bg-background focus-visible:ring-ring/50 h-10 w-full rounded-[var(--radius)] border px-3 text-sm outline-none focus-visible:ring-[3px]";
const LABEL = "text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase";

export function PublicDemandeForm() {
  const t = useTranslations("nouvelleDemande");
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <div className="border-primary/25 bg-primary/5 rounded-[var(--radius)] border p-6 text-center">
        <CheckCircle2 className="text-primary mx-auto size-8" />
        <h2 className="font-display mt-3 text-lg font-medium">
          {t("confirmationTitle")}
        </h2>
        <p className="text-muted-foreground mt-1.5 text-sm">{t("confirmationBody")}</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(fd) =>
        startTransition(async () => {
          const res = await submitPublicDemandeAction(fd);
          if (res.ok) setDone(true);
          else setError(res.error ?? null);
        })
      }
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="clientNom" className={LABEL}>{t("form.company")}</label>
        <input id="clientNom" name="clientNom" required className={FIELD} />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="contactEmail" className={LABEL}>{t("form.email")}</label>
        <input id="contactEmail" name="contactEmail" type="email" className={FIELD} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="produit" className={LABEL}>{t("form.produit")}</label>
        <input id="produit" name="produit" required list="produit-suggestions"
          placeholder={t("form.produitPlaceholder")} className={FIELD} />
        <datalist id="produit-suggestions">
          <option value="Mangue" />
          <option value="Brocoli / Tenderstem" />
          <option value="Patate douce" />
          <option value="Ail" />
          <option value="Fraise" />
        </datalist>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pays" className={LABEL}>{t("form.pays")}</label>
        <input id="pays" name="pays" required list="pays-suggestions"
          placeholder={t("form.paysPlaceholder")} className={FIELD} />
        <datalist id="pays-suggestions">
          <option value="UK" />
          <option value="FR" />
          <option value="NL" />
          <option value="RU" />
        </datalist>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="volume" className={LABEL}>{t("form.volume")}</label>
        <input id="volume" name="volume" className={FIELD} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {t("form.submit")}
        </Button>
        {error && (
          <p className="text-destructive inline-flex items-center gap-1.5 text-sm">
            <TriangleAlert className="size-4" />
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
```

**Step 3 — Page publique**

Créer `src/app/nouvelle-demande/page.tsx` :
```tsx
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PublicDemandeForm } from "@/components/onboarding/public-demande-form";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function NouvelleDemandePage() {
  if (!isFeatureEnabled("ONBOARDING")) notFound();
  const t = await getTranslations("nouvelleDemande");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col">
      <header className="border-border/70 mb-8 flex items-center justify-between gap-3 border-b pb-5">
        <Logo />
        <div className="flex items-center gap-1.5">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </header>

      <section className="mb-8">
        <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
          <span className="bg-harvest inline-block size-2 rounded-[1px]" />
          {t("kicker")}
        </p>
        <h1 className="font-display mt-4 text-3xl leading-[1.05] font-medium tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[60ch] text-sm leading-relaxed">
          {t("subtitle")}
        </p>
      </section>

      <PublicDemandeForm />
    </div>
  );
}
```

**Step 4 — Exclure `/nouvelle-demande` du chrome interne (sidebar)**

Dans `src/components/layout/app-shell.tsx`, remplacer la condition :
```tsx
  if (pathname.startsWith("/portail") || pathname.startsWith("/auth")) {
```
par :
```tsx
  if (
    pathname.startsWith("/portail") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/nouvelle-demande")
  ) {
```
> Vérifier que `/nouvelle-demande` ne collisionne PAS avec `/demande` : `"/nouvelle-demande".startsWith("/demande")` est `false` ✓.

**Step 5 — Clés i18n**

Dans `fr.json`, ajouter une clé racine `"nouvelleDemande"` (par ex. juste après l'objet `"demande"`) :
```json
  "nouvelleDemande": {
    "kicker": "Natural Kiss — Nouvelle demande",
    "title": "Demandez un produit pour votre marché",
    "subtitle": "Indiquez le produit et le pays de destination. Notre équipe vérifie la couverture de nos certifications et revient vers vous avec le pack adapté.",
    "form": {
      "company": "Votre société",
      "email": "Email de contact",
      "produit": "Produit souhaité",
      "produitPlaceholder": "ex. Mangue, Brocoli / Tenderstem…",
      "pays": "Pays de destination",
      "paysPlaceholder": "ex. UK, FR…",
      "volume": "Volume estimé (optionnel)",
      "submit": "Envoyer ma demande"
    },
    "confirmationTitle": "Demande bien reçue",
    "confirmationBody": "Merci ! Notre équipe étudie votre demande et revient vers vous rapidement avec les documents adaptés."
  },
```
Dans `en.json`, même emplacement :
```json
  "nouvelleDemande": {
    "kicker": "Natural Kiss — New request",
    "title": "Request a product for your market",
    "subtitle": "Tell us the product and destination country. Our team checks our certification coverage and gets back to you with the right pack.",
    "form": {
      "company": "Your company",
      "email": "Contact email",
      "produit": "Requested product",
      "produitPlaceholder": "e.g. Mango, Broccoli / Tenderstem…",
      "pays": "Destination country",
      "paysPlaceholder": "e.g. UK, FR…",
      "volume": "Estimated volume (optional)",
      "submit": "Send my request"
    },
    "confirmationTitle": "Request received",
    "confirmationBody": "Thank you! Our team is reviewing your request and will get back to you shortly with the right documents."
  },
```
> ⚠️ Ajouter la virgule après l'objet `"demande"` précédent.

**Step 6 — Vérifier**
```bash
npm run typecheck && npm run lint
```
Expected : PASS.

**Step 7 — Commit**
```bash
git add src/lib/onboarding/actions.ts src/components/onboarding/public-demande-form.tsx src/app/nouvelle-demande/page.tsx src/components/layout/app-shell.tsx src/i18n/messages/fr.json src/i18n/messages/en.json
git commit -m "feat(demande): page publique /nouvelle-demande (soumission client)"
```

---

## Task 8 : Seed de démo (documents + email) + top-up cloud

**Files:**
- Modify: `supabase/seed.sql`
- Create: `scripts/seed-onboarding-docs.mjs`
- Modify: `package.json` (script `seed`)

> But : que `/portail` (client Barfoots seedé, déjà utilisé par les tests e2e) montre des documents en démo, et que `/demande` montre un email. Le seed `seed.sql` sert au reset local ; le top-up `.mjs` (service role, idempotent) sert au **cloud** — c'est le pattern repo (cf. `scripts/seed-onboarding.mjs`).

**Step 1 — Ajouter au `seed.sql`**

Après le bloc `taches_correction` (vers la ligne 298), ajouter :
```sql
-- ── Documents d'onboarding de démo (Brique 7bis) ─────────────────────────────
-- Rattachés au client Barfoots (…-001), utilisé par les parcours e2e portail.
insert into public.documents_onboarding (id, client_id, demande_id, type, titre, contenu_html)
values
  ('a3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', null,
   'bienvenue', 'Bienvenue chez Natural Kiss — Barfoots of Botley Ltd',
   '<h1>Bienvenue, Barfoots of Botley Ltd</h1><p>Votre espace client est actif.</p><p><strong>Accès&nbsp;:</strong> /portail/login</p>'),
  ('a3000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', null,
   'certifs', 'Nos certifications',
   '<h1>Certifications Natural Kiss</h1><ul><li>GlobalG.A.P.</li><li>GRASP</li><li>BRCGS</li><li>SMETA</li><li>Sedex</li></ul>'),
  ('a3000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', null,
   'produit', 'Fiche produit & prochaines étapes — Tenderstem / Bimi',
   '<h1>Tenderstem / Bimi → UK</h1><h2>Prochaines étapes</h2><ol><li>Validation des specs.</li><li>Booking.</li><li>Suivi du lot.</li></ol>');

-- ── Email de démo (boîte d'envoi) ────────────────────────────────────────────
insert into public.emails_envoyes (categorie, to_email, subject, body, client_id)
values
  ('onboarding', 'portail-barfoots@demo.natural-kiss.com',
   'Natural Kiss — bienvenue & accès à votre espace client',
   'Bonjour, votre espace client est prêt. Documents joints : bienvenue, certifications, fiche produit.',
   'b0000000-0000-4000-8000-000000000001');
```

**Step 2 — Créer le top-up idempotent cloud**

Créer `scripts/seed-onboarding-docs.mjs` (calqué sur les autres `seed-*.mjs`) :
```js
// Top-up idempotent des documents d'onboarding de démo (Brique 7bis).
// Aligné sur supabase/seed.sql — sûr à rejouer (upsert par id). Service role.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.");
  process.exit(1);
}
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BARFOOTS = "b0000000-0000-4000-8000-000000000001";
const docs = [
  { id: "a3000000-0000-4000-8000-000000000001", type: "bienvenue",
    titre: "Bienvenue chez Natural Kiss — Barfoots of Botley Ltd",
    contenu_html: "<h1>Bienvenue, Barfoots of Botley Ltd</h1><p>Votre espace client est actif.</p><p><strong>Accès&nbsp;:</strong> /portail/login</p>" },
  { id: "a3000000-0000-4000-8000-000000000002", type: "certifs",
    titre: "Nos certifications",
    contenu_html: "<h1>Certifications Natural Kiss</h1><ul><li>GlobalG.A.P.</li><li>GRASP</li><li>BRCGS</li><li>SMETA</li><li>Sedex</li></ul>" },
  { id: "a3000000-0000-4000-8000-000000000003", type: "produit",
    titre: "Fiche produit & prochaines étapes — Tenderstem / Bimi",
    contenu_html: "<h1>Tenderstem / Bimi → UK</h1><h2>Prochaines étapes</h2><ol><li>Validation des specs.</li><li>Booking.</li><li>Suivi du lot.</li></ol>" },
].map((d) => ({ ...d, client_id: BARFOOTS, demande_id: null }));

const { error } = await admin.from("documents_onboarding").upsert(docs, { onConflict: "id" });
if (error) {
  console.error("Seed documents_onboarding échoué :", error.message);
  process.exit(1);
}
console.log(`✓ ${docs.length} documents d'onboarding de démo (Barfoots).`);
```

**Step 3 — Ajouter au script `seed` de `package.json`**

Modifier la clé `"seed"` :
```json
    "seed": "node scripts/seed-storage.mjs && node scripts/seed-portail.mjs && node scripts/seed-planning.mjs && node scripts/seed-onboarding.mjs && node scripts/seed-booking.mjs && node scripts/seed-onboarding-docs.mjs",
```

**Step 4 — Charger les données de démo sur le cloud**
```bash
node scripts/seed-onboarding-docs.mjs
```
Expected : `✓ 3 documents d'onboarding de démo (Barfoots).`

**Step 5 — Commit**
```bash
git add supabase/seed.sql scripts/seed-onboarding-docs.mjs package.json
git commit -m "chore(seed): documents d'onboarding + email de démo (Barfoots)"
```

---

## Task 9 : Tests e2e

**Files:**
- Create: `tests/e2e/nouvelle-demande.spec.ts`
- Modify: `tests/e2e/portail.spec.ts`

**Step 1 — E2E page publique**

Créer `tests/e2e/nouvelle-demande.spec.ts` :
```ts
import { expect, test } from "@playwright/test";

/**
 * Brique 7bis — la page publique client soumet une demande et affiche une
 * confirmation neutre (le résultat du matching reste côté interne).
 */
test("un client soumet une demande depuis la page publique", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/nouvelle-demande");

  await expect(
    page.getByRole("heading", { name: /Demandez un produit/ }),
  ).toBeVisible();

  await page.getByLabel("Votre société").fill(`E2E Client ${stamp}`);
  await page.getByLabel("Email de contact").fill(`e2e-${stamp}@example.com`);
  await page.getByLabel("Produit souhaité").fill("Brocoli / Tenderstem");
  await page.getByLabel("Pays de destination").fill("UK");
  await page.getByRole("button", { name: /Envoyer ma demande/ }).click();

  await expect(page.getByText(/Demande bien reçue/)).toBeVisible();
});
```

**Step 2 — E2E documents dans le portail**

Dans `tests/e2e/portail.spec.ts`, ajouter à la fin (le helper `login` + les constantes `BARFOOTS_EMAIL` sont déjà définis dans le fichier) :
```ts
test("le client voit sa section « Vos documents » (onboarding)", async ({ page }) => {
  await login(page, BARFOOTS_EMAIL);
  await page.goto("/portail");
  await expect(page).toHaveURL(/\/portail(\/)?$/);

  await expect(
    page.getByRole("heading", { name: /Vos documents/ }),
  ).toBeVisible();
  // Document seedé pour Barfoots.
  await expect(page.getByText(/Nos certifications/)).toBeVisible();
});
```
> Prérequis : `node scripts/seed-onboarding-docs.mjs` a été exécuté (Task 8, Step 4).

**Step 3 — Lancer les e2e**
```bash
npm run test:e2e -- nouvelle-demande portail
```
Expected : PASS. (Playwright lance le serveur dev via `playwright.config.ts`.)

**Step 4 — Commit**
```bash
git add tests/e2e/nouvelle-demande.spec.ts tests/e2e/portail.spec.ts
git commit -m "test(e2e): page publique de demande + section documents du portail"
```

---

## Task 10 : Vérification finale + doc

**Files:**
- Modify: `README.md` (section Brique 7 / vérification — 2-3 lignes)

**Step 1 — Suite complète**
```bash
npm run lint && npm run typecheck && npm run format:check
npm test
npm run test:e2e
```
Expected : tout PASS. Si `format:check` échoue : `npm run format` puis re-commit.

**Step 2 — Note README**

Dans `README.md`, à la section « 13. Vérification manuelle », ajouter un point :
```markdown
4. `/nouvelle-demande` (public) → un client soumet « Brocoli / Tenderstem → UK » →
   confirmation neutre ; la demande apparaît sur `/demande` (interne) avec le pack
   envoyé (voir « Emails envoyés (démo) »), puis « Créer l'espace client » génère
   les documents et l'email d'onboarding ; le client les retrouve dans `/portail`.
```

**Step 3 — Commit**
```bash
git add README.md
git commit -m "docs: parcours de vérification du MVP demande→onboarding→espace client"
```

**Step 4 — Vérification manuelle (démo)**
```bash
npm run dev
```
- `/nouvelle-demande` → soumettre Mangue → UK, puis Brocoli / Tenderstem → UK.
- `/demande` → la demande Brocoli est `Suffisant`, la demande Mangue `Insuffisant` (tâches) ; panneau « Emails envoyés » non vide ; cliquer « Créer l'espace client » sur la demande Brocoli.
- Se connecter au portail (`/portail/login`) avec l'email utilisé → vérifier la section « Vos documents » et l'ouverture d'un document.

---

## Récapitulatif des fichiers

**Créés :**
- `supabase/migrations/0010_documents_onboarding.sql`
- `src/lib/onboarding/documents.ts`
- `src/app/portail/documents/[id]/page.tsx`
- `src/app/nouvelle-demande/page.tsx`
- `src/components/onboarding/public-demande-form.tsx`
- `scripts/seed-onboarding-docs.mjs`
- `tests/unit/onboarding-documents.test.ts`
- `tests/integration/onboarding-documents.test.ts`
- `tests/e2e/nouvelle-demande.spec.ts`

**Modifiés :**
- `src/lib/supabase/types.ts` (généré)
- `src/lib/onboarding/service.ts`
- `src/lib/onboarding/actions.ts`
- `src/lib/portail/data.ts`
- `src/app/portail/page.tsx`
- `src/app/demande/page.tsx`
- `src/components/layout/app-shell.tsx`
- `src/i18n/messages/fr.json`, `src/i18n/messages/en.json`
- `supabase/seed.sql`, `package.json`, `README.md`
- `tests/e2e/portail.spec.ts`

## Principes respectés
- **DRY** : réutilise `createDemande`/`matchDemande`/portail RLS ; aucun moteur dupliqué.
- **YAGNI** : templates HTML simples, email mock, pas de PDF ni de raffinements Slack (sites, whitelist organismes, paliers) — notés « hors scope » dans le design.
- **TDD** : logique pure (Task 2) et service (Task 3) écrits test-first ; RLS prouvée par intégration.
- **Commits fréquents** : un commit par tâche, messages en français (convention repo).
