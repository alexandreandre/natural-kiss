export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];

/** Langue par défaut : FR (interne). */
export const defaultLocale: Locale = "fr";

/** Cookie où l'on stocke le choix de langue (setup next-intl sans routing). */
export const LOCALE_COOKIE = "NK_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
