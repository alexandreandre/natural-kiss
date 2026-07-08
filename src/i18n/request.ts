import { getRequestConfig } from "next-intl/server";

import { getUserLocale } from "@/i18n/locale";

/**
 * Configuration de requête next-intl (setup *sans* routing par URL) :
 * la locale vient d'un cookie, les mêmes routes servent FR et EN.
 */
export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  const messages = (await import(`@/i18n/messages/${locale}.json`)).default;
  return { locale, messages };
});
