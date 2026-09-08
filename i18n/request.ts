// i18n/request.ts
// next-intl server-side locale detection.
// Locale comes from the ui_locale cookie (set by LanguageSwitcher or first-visit middleware).

import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale } from "./config";
import { isPublicSalesHost } from "@/lib/sales/salesHosts";
import { ENTETE_LANGUE } from "@/lib/site/langues";

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

/**
 * LA LANGUE DITE PAR L'URL GAGNE SUR LE COOKIE (8 septembre 2026).
 *
 * `/en/tarifs` est servi par une réécriture du middleware, qui pose la
 * langue dans un en-tête de requête. Sans cette lecture, la page
 * prendrait le cookie : elle servirait donc du FRANÇAIS sous une
 * adresse anglaise à quelqu'un dont le cookie dit "fr", et Google
 * indexerait cette page là.
 *
 * Rien ne s'affiche de travers dans ce cas : c'est exactement la forme
 * de panne que ce dépôt paie le plus cher, et c'est pour ça que l'ordre
 * de ces trois lignes est une règle et pas un détail.
 *
 * Le cookie garde tout son rôle : il décide partout où l'URL ne se
 * prononce pas, c'est à dire l'app derrière connexion et le français,
 * qui n'a pas de préfixe.
 */
async function langueDeLUrl(): Promise<SupportedLocale | null> {
  try {
    const h = await headers();
    const dite = h.get(ENTETE_LANGUE) ?? "";
    return isSupportedLocale(dite) ? dite : null;
  } catch {
    return null;
  }
}

export default getRequestConfig(async () => {
  const dite = await langueDeLUrl();
  const cookieStore = await cookies();
  const raw = cookieStore.get("ui_locale")?.value ?? "";
  const locale: SupportedLocale =
    dite ?? (isSupportedLocale(raw) ? raw : await langueParDefaut());

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
