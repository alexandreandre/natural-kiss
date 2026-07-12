"use client";

import { MailCheck, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * Connexion du portail par **magic link** (Supabase Auth) — aucun mot de passe.
 * Envoie un lien de connexion à l'email saisi ; le lien redirige vers
 * `/auth/callback` qui ouvre la session.
 */
export function PortailLoginForm() {
  const t = useTranslations("portail.login");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setError(null);
          const supabase = createClient();
          const { error: err } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false,
              emailRedirectTo: `${window.location.origin}/auth/callback?next=/portail`,
            },
          });
          if (err) {
            setError(err.message);
            return;
          }
          setSent(true);
        });
      }}
    >
      {sent ? (
        <div className="text-primary border-primary/20 bg-primary/[0.05] flex items-start gap-3 rounded-[4px] border p-4 text-sm">
          <MailCheck className="mt-0.5 size-4 shrink-0" />
          <p>{t("sent", { email })}</p>
        </div>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.12em] uppercase">
              {t("emailLabel")}
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="border-border bg-background h-10 rounded-md border px-3 text-sm"
            />
          </label>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button
            type="submit"
            size="lg"
            disabled={pending || !email}
            className="w-full"
          >
            <Send className="size-4" />
            {pending ? t("sending") : t("submit")}
          </Button>
        </>
      )}
    </form>
  );
}
