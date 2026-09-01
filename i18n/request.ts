// i18n/request.ts
// next-intl server-side locale detection.
// Locale comes from the ui_locale cookie (set by LanguageSwitcher or first-visit middleware).

import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale } from "./config";
import { isPublicSalesHost } from "@/lib/sales/salesHosts";

export type { SupportedLocale };
export { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "./config";
export { RTL_LOCALES } from "./config";

function isSupportedLocale(v: string): v is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

/**
 * LA LANGUE QUAND PERSONNE N'A CHOISI, ET POURQUOI ELLE DÉPEND DU DOMAINE.
 *
 * 1er septembre 2026. `DEFAULT_LOCALE` vaut "en", et un robot n'envoie
 * jamais de cookie : Google lisait donc `tiquiz.fr/legal` en ANGLAIS et
 * l'indexait comme tel. « Legal Notice · Tiquiz » sur un domaine en .fr,
 * pour une SAS française qui vend en français, c'est la première chose
 * qu'un acheteur méfiant va vérifier, et il y trouvait une autre langue
 * que celle du reste du site.
 *
 * `tiquiz.fr` est le domaine FRANÇAIS de la marque : sa page de vente et
 * son blog sont écrits en français et ne sont pas traduits. Sa langue
 * par défaut est donc le français, et l'anglais reste le repli partout
 * ailleurs (l'app, servie sur `quiz.tipote.com`, est internationale).
 *
 * Ça ne retire rien à personne : un visiteur qui a une préférence a un
 * cookie, et ce cookie gagne toujours. Seul le cas « aucune préférence
 * connue » change de réponse.
 */
async function langueParDefaut(): Promise<SupportedLocale> {
  try {
    const h = await headers();
    if (isPublicSalesHost(h.get("host"))) return "fr";
  } catch {
    // Pas de requête en cours (build, script) : on garde le repli global.
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("ui_locale")?.value ?? "";
  const locale: SupportedLocale = isSupportedLocale(raw) ? raw : await langueParDefaut();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
