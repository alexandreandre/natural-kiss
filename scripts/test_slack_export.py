"""Tests unitaires des fonctions pures de slack_export.

Lancer : python scripts/test_slack_export.py
Aucune dépendance externe requise (les imports Slack sont paresseux).
"""
import unittest

from slack_export import (
    sanitize_filename,
    ts_to_iso,
    file_local_name,
    dedupe_sort_messages,
    render_transcript,
    explain_slack_error,
    resolve_mentions,
    normalize_message,
)


class SanitizeFilename(unittest.TestCase):
    def test_keeps_simple_name(self):
        self.assertEqual(sanitize_filename("design.pdf"), "design.pdf")

    def test_replaces_spaces(self):
        self.assertEqual(sanitize_filename("Q3 report.pdf"), "Q3_report.pdf")

    def test_collapses_repeated_separators(self):
        self.assertEqual(sanitize_filename("my file (1).png"), "my_file_1_.png")

    def test_strips_path_components(self):
        self.assertEqual(sanitize_filename("a/b/c.png"), "c.png")

    def test_blocks_traversal(self):
        self.assertEqual(sanitize_filename("../secret"), "secret")

    def test_empty_becomes_unnamed(self):
        self.assertEqual(sanitize_filename(""), "unnamed")

    def test_whitespace_becomes_unnamed(self):
        self.assertEqual(sanitize_filename("   "), "unnamed")

    def test_only_dots_becomes_unnamed(self):
        self.assertEqual(sanitize_filename("...."), "unnamed")


class TsToIso(unittest.TestCase):
    def test_epoch_zero(self):
        self.assertEqual(ts_to_iso("0"), "1970-01-01T00:00:00+00:00")

    def test_known_timestamp_utc(self):
        self.assertEqual(ts_to_iso("1000000000.000000"), "2001-09-09T01:46:40+00:00")

    def test_drops_subsecond(self):
        self.assertEqual(ts_to_iso("1000000000.987654"), "2001-09-09T01:46:40+00:00")


class FileLocalName(unittest.TestCase):
    def test_prefixes_with_file_id(self):
        self.assertEqual(file_local_name("F0ABC", "Q3 report.pdf"), "F0ABC_Q3_report.pdf")

    def test_missing_name(self):
        self.assertEqual(file_local_name("F0ABC", ""), "F0ABC_unnamed")


class DedupeSortMessages(unittest.TestCase):
    def test_sorts_ascending_by_ts(self):
        msgs = [{"ts": "3.0"}, {"ts": "1.0"}, {"ts": "2.0"}]
        self.assertEqual([m["ts"] for m in dedupe_sort_messages(msgs)], ["1.0", "2.0", "3.0"])

    def test_dedupes_by_ts_keeping_last(self):
        msgs = [{"ts": "1.0", "text": "a"}, {"ts": "1.0", "text": "a-updated"}]
        out = dedupe_sort_messages(msgs)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["text"], "a-updated")


class RenderTranscript(unittest.TestCase):
    def setUp(self):
        self.users = {"U1": "Alice", "U2": "Bob"}
        self.messages = [
            {"ts": "100.0", "user": "U1", "text": "Hello team", "thread_ts": "100.0"},
            {"ts": "101.0", "user": "U2", "text": "Reply here", "thread_ts": "100.0"},
            {"ts": "102.0", "user": "U1", "text": "See file",
             "files": [{"id": "F1", "name": "report.pdf"}]},
        ]

    def test_resolves_display_names(self):
        md = render_transcript(self.messages, self.users)
        self.assertIn("**Alice**", md)
        self.assertIn("**Bob**", md)

    def test_includes_message_text(self):
        md = render_transcript(self.messages, self.users)
        self.assertIn("Hello team", md)
        self.assertIn("Reply here", md)

    def test_reply_follows_parent(self):
        md = render_transcript(self.messages, self.users)
        self.assertLess(md.index("Hello team"), md.index("Reply here"))

    def test_reply_is_blockquoted(self):
        md = render_transcript(self.messages, self.users)
        self.assertIn("> ", md)

    def test_links_downloaded_file(self):
        md = render_transcript(self.messages, self.users)
        self.assertIn("files/F1_report.pdf", md)

    def test_unknown_user_falls_back_to_id(self):
        md = render_transcript([{"ts": "1.0", "user": "U9", "text": "hi"}], {})
        self.assertIn("U9", md)


class ExplainSlackError(unittest.TestCase):
    def test_invalid_auth_mentions_token(self):
        self.assertIn("token", explain_slack_error("invalid_auth").lower())

    def test_missing_scope_mentions_scope(self):
        self.assertIn("scope", explain_slack_error("missing_scope").lower())

    def test_not_in_channel_mentions_membership(self):
        self.assertIn("membre", explain_slack_error("not_in_channel").lower())

    def test_channel_not_found_points_to_list(self):
        self.assertIn("--list", explain_slack_error("channel_not_found"))

    def test_unknown_code_is_echoed(self):
        self.assertIn("boom", explain_slack_error("boom"))


class ResolveMentions(unittest.TestCase):
    def test_user_mention_becomes_name(self):
        self.assertEqual(resolve_mentions("<@U1> a rejoint", {"U1": "Val"}), "@Val a rejoint")

    def test_unknown_user_keeps_id(self):
        self.assertEqual(resolve_mentions("<@U9> hi", {}), "@U9 hi")

    def test_user_mention_with_label_prefers_map(self):
        self.assertEqual(resolve_mentions("<@U1|val> hi", {"U1": "Val"}), "@Val hi")

    def test_unknown_user_with_label_uses_label(self):
        self.assertEqual(resolve_mentions("<@U9|val> hi", {}), "@val hi")

    def test_channel_mention(self):
        self.assertEqual(resolve_mentions("voir <#C1|général>", {}), "voir #général")

    def test_special_here(self):
        self.assertEqual(resolve_mentions("<!here> go", {}), "@here go")

    def test_link_with_label(self):
        self.assertEqual(resolve_mentions("<https://x.com|le site>", {}), "le site")

    def test_link_without_label(self):
        self.assertEqual(resolve_mentions("<https://x.com>", {}), "https://x.com")

    def test_empty_text(self):
        self.assertEqual(resolve_mentions("", {}), "")

    def test_none_text(self):
        self.assertIsNone(resolve_mentions(None, {}))


class NormalizeMessage(unittest.TestCase):
    def test_keeps_essential_fields(self):
        out = normalize_message(
            {"ts": "1000000000.0", "user": "U1", "text": "hi <@U2>"},
            {"U1": "Alice", "U2": "Bob"})
        self.assertEqual(out["ts"], "1000000000.0")
        self.assertEqual(out["time"], "2001-09-09T01:46:40+00:00")
        self.assertEqual(out["user"], "Alice")
        self.assertEqual(out["user_id"], "U1")
        self.assertEqual(out["text"], "hi @Bob")

    def test_drops_noise_keys(self):
        out = normalize_message(
            {"ts": "1.0", "user": "U1", "text": "x", "client_msg_id": "abc",
             "blocks": [{"a": 1}], "team": "T1", "type": "message"}, {})
        for junk in ("client_msg_id", "blocks", "team", "type"):
            self.assertNotIn(junk, out)

    def test_normalizes_files(self):
        out = normalize_message(
            {"ts": "1.0", "user": "U1", "files": [
                {"id": "F1", "name": "a b.pdf", "filetype": "pdf", "size": 123,
                 "url_private": "https://x", "permalink": "https://y", "is_starred": False}]},
            {})
        self.assertEqual(out["files"], [
            {"name": "a b.pdf", "filetype": "pdf", "size": 123, "path": "files/F1_a_b.pdf"}])

    def test_omits_empty_text(self):
        out = normalize_message({"ts": "1.0", "user": "U1", "subtype": "channel_join"}, {})
        self.assertNotIn("text", out)
        self.assertEqual(out["subtype"], "channel_join")

    def test_reactions_reduced_to_name_and_count(self):
        out = normalize_message(
            {"ts": "1.0", "user": "U1", "text": "x",
             "reactions": [{"name": "tada", "count": 3, "users": ["U1", "U2", "U3"]}]}, {})
        self.assertEqual(out["reactions"], [{"name": "tada", "count": 3}])

    def test_thread_ts_kept_when_present(self):
        out = normalize_message(
            {"ts": "2.0", "user": "U1", "text": "reply", "thread_ts": "1.0"}, {})
        self.assertEqual(out["thread_ts"], "1.0")


if __name__ == "__main__":
    unittest.main(verbosity=2)
