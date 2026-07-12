"""Export local d'un canal Slack (messages + threads + médias) vers tmp/slack/.

Lecture seule. Une commande, lancée à la demande. Pas de Socket Mode.

    python scripts/slack_export.py --list   # lister les canaux visibles
    python scripts/slack_export.py          # exporter le canal de .env

Voir docs/plans/2026-07-08-slack-export-design.md et le README pour la mise en place.
"""
import json
import os
import re
import shutil
import urllib.error
import urllib.request
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Fonctions pures (couvertes par test_slack_export.py)
# ---------------------------------------------------------------------------


def sanitize_filename(name):
    """Rend un nom de fichier sûr : basename seul, caractères restreints."""
    name = "" if name is None else str(name)
    name = name.replace("\\", "/").split("/")[-1]  # empêche la traversée de chemin
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    name = re.sub(r"_+", "_", name)
    name = name.strip("._ ")
    return name or "unnamed"


def ts_to_iso(ts):
    """Horodatage Slack ('1657289473.123456') -> ISO 8601 UTC, à la seconde."""
    seconds = int(float(ts))
    return datetime.fromtimestamp(seconds, tz=timezone.utc).isoformat()


def file_local_name(file_id, name):
    """Nom local d'un média, préfixé par l'id Slack pour éviter les collisions."""
    return f"{file_id}_{sanitize_filename(name)}"


def dedupe_sort_messages(messages):
    """Dédoublonne par 'ts' (dernier gagnant) et trie par ordre chronologique."""
    by_ts = {}
    for m in messages:
        by_ts[m.get("ts")] = m
    return sorted(by_ts.values(), key=lambda m: float(m.get("ts", "0")))


def resolve_mentions(text, users):
    """Remplace la syntaxe Slack (<@U…>, <#C…>, <!here>, <url|texte>) par du lisible."""
    if not text:
        return text
    text = re.sub(r"<@([A-Z0-9]+)(?:\|([^>]+))?>",
                  lambda m: "@" + (users.get(m.group(1)) or m.group(2) or m.group(1)), text)
    text = re.sub(r"<#([A-Z0-9]+)(?:\|([^>]+))?>",
                  lambda m: "#" + (m.group(2) or m.group(1)), text)
    text = re.sub(r"<!(here|channel|everyone)>", lambda m: "@" + m.group(1), text)
    text = re.sub(r"<(https?://[^>|]+)(?:\|([^>]+))?>",
                  lambda m: m.group(2) or m.group(1), text)
    return text


def _display_name(msg, users):
    uid = msg.get("user") or msg.get("username") or ""
    return users.get(uid) or uid or "unknown"


def _file_links(msg):
    lines = []
    for f in msg.get("files", []) or []:
        fid = f.get("id", "F")
        name = f.get("name", "")
        local = file_local_name(fid, name)
        lines.append(f"\U0001F4CE [{name or local}](files/{local})")
    return lines


def _render_message(msg, users, quote=False):
    header = f"**{_display_name(msg, users)}** · {ts_to_iso(msg.get('ts', '0'))}"
    body = []
    text = resolve_mentions(msg.get("text") or "", users).strip()
    if text:
        body.append(text)
    links = _file_links(msg)
    if links:
        body.append("\n".join(links))
    block = header + ("\n\n" + "\n\n".join(body) if body else "")
    if quote:
        block = "\n".join((f"> {line}" if line else ">") for line in block.split("\n"))
    return block


def render_transcript(messages, users):
    """Rend un transcript Markdown lisible : threads indentés sous leur parent."""
    messages = dedupe_sort_messages(messages)
    replies_by_parent = {}
    parents = []
    for m in messages:
        thread_ts = m.get("thread_ts")
        if thread_ts and thread_ts != m.get("ts"):
            replies_by_parent.setdefault(thread_ts, []).append(m)
        else:
            parents.append(m)

    chunks = []
    for p in parents:
        parts = [_render_message(p, users)]
        for r in replies_by_parent.get(p.get("ts"), []):
            parts.append(_render_message(r, users, quote=True))
        chunks.append("\n\n".join(parts))

    return ("\n\n---\n\n".join(chunks) + "\n") if chunks else ""


def normalize_message(msg, users):
    """Réduit un message Slack brut à l'essentiel lisible (jette blocks, urls, etc.)."""
    out = {"ts": msg.get("ts"), "time": ts_to_iso(msg.get("ts", "0")),
           "user": _display_name(msg, users)}
    if msg.get("user"):
        out["user_id"] = msg["user"]
    text = resolve_mentions(msg.get("text") or "", users).strip()
    if text:
        out["text"] = text
    if msg.get("subtype"):
        out["subtype"] = msg["subtype"]
    if msg.get("thread_ts"):
        out["thread_ts"] = msg["thread_ts"]
    if msg.get("reply_count"):
        out["reply_count"] = msg["reply_count"]
    if msg.get("edited"):
        out["edited"] = True

    files = []
    for f in msg.get("files", []) or []:
        entry = {"name": f.get("name"), "filetype": f.get("filetype"),
                 "size": f.get("size"),
                 "path": "files/" + file_local_name(f.get("id", "F"), f.get("name", ""))}
        if f.get("title") and f["title"] != f.get("name"):
            entry["title"] = f["title"]
        files.append(entry)
    if files:
        out["files"] = files

    reactions = [{"name": r.get("name"), "count": r.get("count")}
                 for r in msg.get("reactions", []) or []]
    if reactions:
        out["reactions"] = reactions
    return out


_SLACK_ERROR_HINTS = {
    "invalid_auth": "Token invalide ou expiré. Régénère ton token utilisateur (xoxp-) "
                    "dans les réglages de l'app Slack, puis mets-le à jour dans .env.",
    "not_authed": "Aucun token envoyé à Slack. Vérifie SLACK_TOKEN dans .env.",
    "account_inactive": "Le compte ou l'app associé à ce token est désactivé.",
    "missing_scope": "Il manque une permission (scope) au token. Ajoute channels:history "
                     "et channels:read (public) — ou groups:history et groups:read (privé) — "
                     "plus files:read et users:read, puis réinstalle l'app.",
    "channel_not_found": "Canal introuvable. Lance --list pour récupérer le bon ID, "
                         "puis mets à jour SLACK_CHANNEL dans .env.",
    "not_in_channel": "Tu n'es pas membre de ce canal. Rejoins-le dans Slack "
                      "(ou fais-toi inviter s'il est privé), puis relance.",
}


def explain_slack_error(code):
    """Traduit un code d'erreur Slack en conseil lisible (français)."""
    return _SLACK_ERROR_HINTS.get(code, f"Erreur Slack : {code}.")


# ---------------------------------------------------------------------------
# Couche I/O Slack — vérifiée manuellement avec un vrai token (pas de test
# automatisé : nécessite des identifiants + réseau). Imports Slack paresseux
# pour que les tests des fonctions pures tournent sans dépendances installées.
# ---------------------------------------------------------------------------

DEFAULT_EXPORT_DIR = "tmp/slack"


def load_config():
    """Charge .env et renvoie (token, channel, export_dir). N'affiche jamais le token."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ModuleNotFoundError:
        pass  # dotenv optionnel : les variables d'environnement suffisent
    token = os.environ.get("SLACK_TOKEN", "").strip()
    channel = os.environ.get("SLACK_CHANNEL", "").strip()
    export_dir = os.environ.get("SLACK_EXPORT_DIR", "").strip() or DEFAULT_EXPORT_DIR
    return token, channel, export_dir


def make_client(token):
    from slack_sdk import WebClient
    from slack_sdk.http_retry.builtin_handlers import RateLimitErrorRetryHandler
    client = WebClient(token=token)
    client.retry_handlers.append(RateLimitErrorRetryHandler(max_retry_count=5))
    return client


def _paginate(method, key, **kwargs):
    """Itère sur toutes les pages d'une méthode Slack cursor-paginée."""
    cursor = None
    while True:
        resp = method(cursor=cursor, limit=200, **kwargs)
        for item in resp.get(key, []):
            yield item
        cursor = (resp.get("response_metadata") or {}).get("next_cursor")
        if not cursor:
            break


def list_channels(client):
    channels = list(_paginate(
        client.users_conversations, "channels",
        types="public_channel,private_channel", exclude_archived=True,
    ))
    channels.sort(key=lambda c: c.get("name", ""))
    if not channels:
        print("Aucun canal visible avec ce token. (Les scopes channels:read / groups:read sont-ils accordés ?)")
        return
    print(f"{len(channels)} canal(aux) visible(s) :\n")
    for c in channels:
        kind = "privé " if c.get("is_private") else "public"
        print(f"  [{kind}] {c['id']}  #{c.get('name', '?')}")
    print("\nColle l'ID choisi dans .env : SLACK_CHANNEL=Cxxxxxxxx")


def resolve_channel(client, channel):
    """Renvoie l'ID du canal. Accepte un ID direct ou un nom (#general)."""
    channel = channel.lstrip("#").strip()
    if re.fullmatch(r"[CGD][A-Z0-9]{6,}", channel):
        return channel
    for c in _paginate(client.users_conversations, "channels",
                       types="public_channel,private_channel", exclude_archived=True):
        if c.get("name") == channel:
            return c["id"]
    raise SystemExit(f"Canal introuvable : {channel!r}. Lance --list pour voir les IDs.")


def build_user_map(client, user_ids):
    users = {}
    for uid in sorted(u for u in user_ids if u):
        try:
            info = client.users_info(user=uid)["user"]
            profile = info.get("profile", {})
            users[uid] = (profile.get("display_name") or profile.get("real_name")
                          or info.get("name") or uid)
        except Exception:
            users[uid] = uid  # bot, utilisateur supprimé, scope manquant : on garde l'id
    return users


def download_file(token, file_obj, files_dir):
    url = file_obj.get("url_private_download") or file_obj.get("url_private")
    if not url:
        return
    local = file_local_name(file_obj.get("id", "F"), file_obj.get("name", ""))
    dest = os.path.join(files_dir, local)
    if os.path.exists(dest):
        return  # déjà téléchargé : idempotence par le disque
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as resp, open(dest, "wb") as fh:
            shutil.copyfileobj(resp, fh)
    except (urllib.error.URLError, OSError) as e:
        print(f"  ! échec du téléchargement de {local} : {e}")


def export_channel(token, channel, export_dir):
    client = make_client(token)
    channel_id = resolve_channel(client, channel)
    out_dir = os.path.join(export_dir, channel_id)
    files_dir = os.path.join(out_dir, "files")
    os.makedirs(files_dir, exist_ok=True)

    print(f"Récupération de l'historique de {channel_id} …")
    top = list(_paginate(client.conversations_history, "messages", channel=channel_id))

    all_messages = list(top)
    for m in top:
        if m.get("reply_count"):  # ce message est le parent d'un thread
            for r in _paginate(client.conversations_replies, "messages",
                               channel=channel_id, ts=m["ts"]):
                if r.get("ts") != m.get("ts"):
                    all_messages.append(r)

    all_messages = dedupe_sort_messages(all_messages)
    print(f"{len(all_messages)} message(s).")

    print("Résolution des noms d'utilisateur …")
    users = build_user_map(client, {m.get("user") for m in all_messages})

    print("Téléchargement des médias …")
    for m in all_messages:
        for f in m.get("files", []) or []:
            download_file(token, f, files_dir)

    with open(os.path.join(out_dir, "messages.jsonl"), "w", encoding="utf-8") as fh:
        for m in all_messages:
            fh.write(json.dumps(normalize_message(m, users), ensure_ascii=False) + "\n")

    header = (f"# Canal Slack `{channel_id}`\n\n"
              f"_{len(all_messages)} messages · export généré le "
              f"{datetime.now(timezone.utc).isoformat(timespec='seconds')}_\n\n---\n\n")
    with open(os.path.join(out_dir, "transcript.md"), "w", encoding="utf-8") as fh:
        fh.write(header + render_transcript(all_messages, users))

    print(f"\n✅ Export terminé dans {out_dir}/")
    print("   - transcript.md  (lisible, indexable par Cursor)")
    print("   - messages.jsonl (données brutes Slack)")
    print("   - files/         (médias téléchargés)")


def main(argv=None):
    import argparse
    parser = argparse.ArgumentParser(
        description="Export local d'un canal Slack (lecture seule, à la demande).")
    parser.add_argument("--list", action="store_true",
                        help="Lister les canaux visibles avec ce token, puis quitter.")
    parser.add_argument("--channel", help="Forcer l'ID/nom du canal (sinon SLACK_CHANNEL de .env).")
    parser.add_argument("--out", help="Dossier de sortie (sinon SLACK_EXPORT_DIR ou tmp/slack).")
    args = parser.parse_args(argv)

    token, channel, export_dir = load_config()
    if not token:
        raise SystemExit("SLACK_TOKEN manquant. Crée un fichier .env à la racine (voir .env.example).")

    from slack_sdk.errors import SlackApiError
    try:
        if args.list:
            list_channels(make_client(token))
            return

        channel = args.channel or channel
        if not channel:
            raise SystemExit("SLACK_CHANNEL manquant. Lance --list pour trouver l'ID, puis remplis .env.")
        export_channel(token, channel, args.out or export_dir)
    except SlackApiError as e:
        resp = e.response or {}
        code = resp.get("error", "?")
        msg = explain_slack_error(code)
        if code == "missing_scope":
            needed = resp.get("needed")
            provided = resp.get("provided")
            msg += f"\n   Slack — requis : {needed}\n   Slack — fourni : {provided}"
        raise SystemExit(f"❌ {msg}")


if __name__ == "__main__":
    main()
