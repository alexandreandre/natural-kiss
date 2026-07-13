# Export local d'un canal Slack

Exporte **tout un canal Slack** (messages, threads, médias) dans `tmp/slack/<channel_id>/`,
à la demande. Lecture seule, une commande. Pas de bot à inviter, pas de Socket Mode,
compatible VPN (requêtes HTTPS classiques).

Produit, par canal :

- `transcript.md` — lisible, chronologique, mentions `@Nom` résolues (le fichier que Cursor indexe le mieux)
- `messages.jsonl` — un message par ligne, **normalisé** (heure, auteur, texte,
  fichiers) sans le bruit Slack — pratique pour un LLM ou du scripting
- `files/` — médias téléchargés

## Utilisation (une seule commande)

```bash
./scripts/slack-pull            # exporte le canal → tmp/slack/<id>/
./scripts/slack-pull --list     # liste les canaux visibles avec ton token
```

Au **premier lancement**, la commande crée l'environnement Python et installe les
dépendances toute seule (~15 s). Ensuite c'est instantané. Il te faut juste un fichier
`.env` avec ton token (voir ci-dessous) ; le canal du projet est déjà pré-configuré.

Relançable quand tu veux pour rafraîchir : l'historique et le `transcript.md` sont
régénérés (donc éditions/suppressions prises en compte), et les médias déjà présents
ne sont pas re-téléchargés.

## 1. Obtenir un token Slack (une fois)

Le script a besoin d'un token qui lit le canal. Deux choix :

**a) Token utilisateur (`xoxp-…`)** — agit en ton nom, lit les canaux que tu vois déjà.

1. <https://api.slack.com/apps> → **Create New App** → **From scratch** → nomme-la,
   choisis ton workspace → **Create App**.
2. Menu de gauche → **OAuth & Permissions**.
3. **Scopes → User Token Scopes** (⚠️ _User_, pas _Bot_) → **Add an OAuth Scope**, ajoute :
   `channels:history`, `channels:read`, `groups:history`, `groups:read`, `files:read`, `users:read`.
4. Remonte en haut → **Install to Workspace** → **Allow**.
   (Si validation admin requise : un admin approuve, puis reviens.)
5. Copie le **User OAuth Token** (`xoxp-…`).

> ⚠️ Ne confonds pas avec les « App Configuration Tokens » de la page d'accueil
> (`xoxe.xoxp-…`, _Expires in 12 hours_) : ce ne sont PAS les bons.

**b) Token bot (`xoxb-…`)** — identité de l'app, partageable en équipe. Mêmes scopes
sous **Bot Token Scopes**, réinstalle, puis dans Slack : `/invite @NomDeTonApp` dans le
canal. Utilise le **Bot User OAuth Token**.

## 2. Configurer

```bash
cp .env.example .env          # à la racine du repo
# ouvre .env, colle ton token dans SLACK_TOKEN
```

Le canal (`#ia-fruits-et-légumes`, `C0BEBF3E2TG`) est déjà pré-rempli dans `.env.example`.
Pour un autre canal : `./scripts/slack-pull --list`, puis mets l'ID dans `SLACK_CHANNEL`.

⚠️ `.env` n'est jamais commité (il est dans `.gitignore`). Ne colle ton token nulle part ailleurs.

## Pour un collaborateur du repo

1. `git clone …` puis `cd` dans le repo.
2. `cp .env.example .env`
3. Mets un token dans `SLACK_TOKEN` — le tien (étape 1), ou celui qu'un coéquipier t'a
   transmis **en privé** (jamais par git). Un token partagé fonctionne à l'identique.
4. `./scripts/slack-pull` — le reste (venv, dépendances) s'installe automatiquement.

## Notes

- **Rate limits** gérés automatiquement (retry sur `Retry-After`).
- **Erreurs claires** : token/scope/canal invalides → message explicite, pas de traceback.
- Tests des fonctions pures : `python3 scripts/test_slack_export.py`.
- Le dossier `tmp/` est git-ignoré : les données et médias exportés ne sont jamais commités.

## Scopes selon le type de canal (rappel)

| Type de canal | Scopes requis                                                   |
| ------------- | --------------------------------------------------------------- |
| Public        | `channels:history`, `channels:read`, `files:read`, `users:read` |
| Privé         | `groups:history`, `groups:read`, `files:read`, `users:read`     |
