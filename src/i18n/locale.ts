"use server";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, defaultLocale, isLocale, type Locale } from "@/i18n/config";

/** Locale courante (cookie), FR par défaut. */
export async function getUserLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

/** Change la langue (server action déclenchée depuis le sélecteur). */
export async function setUserLocale(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
