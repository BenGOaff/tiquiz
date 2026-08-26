// lib/analytics/google.ts (Tiquiz)
//
// LES OUTILS GOOGLE : SUR LES PAGES DE VENTE, ET NULLE PART AILLEURS.
//
// Béné, 26 août 2026 : "juste tiquiz.fr et atelierduquiz.fr : je m'en
// fous de faire ranker les app, je veux faire ranker les pages de vente.
// Pas les quiz ni le reste. Pour les quiz etc chaque user pose ses
// propres info de tracking."
//
// -- POURQUOI CE N'EST PAS "UNE BALISE DANS LE LAYOUT" -----------------
//
// Notre `<head>` est servi sur QUATRE familles de domaines :
//
//   1. la PAGE DE VENTE, `tiquiz.fr` : la seule qu'on veut faire
//      remonter dans Google, et la seule qu'on veut mesurer ;
//   2. l'APP, `quiz.tipote.com` : un espace de travail derrière une
//      connexion, qui n'a aucune raison de ranker ;
//   3. le DOMAINE PERSONNALISÉ d'une créatrice (example.com), que le
//      portier des domaines personnalisés laisse passer ;
//   4. la même app, en local et en préversion.
//
// **Règle : les outils Google vivent sur le DOMAINE DE VENTE, point.**
//
// Ce n'est pas de la prudence, chacune des trois autres familles a sa
// raison propre :
//
// - **le jeton de vérification sur le domaine d'une cliente** permettrait
//   à Béné de revendiquer CE domaine dans sa Search Console, et donc de
//   voir les données de recherche de sa cliente. Ce n'est pas une faille
//   technique, c'est une capacité qu'on ne veut pas ouvrir par accident ;
// - **les quiz ont DÉJÀ leur mesure, et elle appartient à la créatrice**
//   (`lib/effectivePixels.ts` : son pixel Meta, son GA4, sa conversion
//   Google Ads). Poser le nôtre à côté mélangerait le trafic de ses
//   visiteurs au nôtre, et rendrait illisibles les chiffres des deux ;
// - **l'app derrière connexion** n'apporte que du bruit : des sessions
//   de travail comptées comme des visites, sur des pages qu'on ne veut
//   surtout pas voir remonter dans une recherche.
//
// -- CE QUI N'EST PAS TRANCHÉ ICI, ET QUI EST À ELLE -------------------
//
// Le CONSENTEMENT. Google Analytics dépose des cookies de mesure, et en
// Europe ça demande le consentement de la personne (l'écran de Google le
// dit lui même : "si vous avez des utilisateurs finaux dans l'EEE,
// configurez le mode Consentement"). Il n'y a aucun bandeau cookies dans
// cette app aujourd'hui. Le code ci-dessous ne prétend donc PAS être
// conforme : il pose la balise là où elle a du sens, et
// `GA_ATTEND_CONSENTEMENT` est le seul endroit à changer le jour où le
// bandeau existe.

/**
 * L'identifiant de mesure GA4, écrit UNE fois.
 *
 * Pas d'`env` : ce n'est pas un secret (il part dans le HTML de chaque
 * page), et une variable absente en production désactiverait la mesure
 * en silence. Ce qui décide de charger ou non, c'est le DOMAINE.
 */
export const GA_MEASUREMENT_ID = "G-N6LQDRDMDB";

/**
 * Le jeton de propriété Search Console.
 *
 * Il prouve à Google que ce domaine est à nous. Il est public par
 * construction : Google vient le lire dans le HTML.
 */
export const GOOGLE_SITE_VERIFICATION = "4k7FK9pvBtwkoqaNmGd0vcXE3xYq3lsoJgzt9J4sav8";

/**
 * Le jour où un bandeau cookies existera, passer ceci à `true` et
 * brancher le mode Consentement de Google. Tant que c'est `false`, la
 * balise se charge dès qu'elle est servie sur un de nos domaines.
 */
export const GA_ATTEND_CONSENTEMENT = false;

/**
 * Les chemins PUBLICS servis pour le compte d'une créatrice.
 *
 * `/q` et `/s` sont les quiz publics, `/embed` est le quiz affiché dans
 * un iframe sur le site de la cliente. Le domaine de vente ne devrait
 * jamais en servir, mais **une défense qui ne coûte rien se garde** :
 * le jour où un quiz est servi sous `tiquiz.fr`, le seul contrôle de
 * l'hôte laisserait passer une mesure qui ne nous appartient pas.
 */
const CHEMINS_DE_NOS_CLIENTES = ["/q", "/s", "/embed"];

function estUnChemin(pathname: string, prefixes: string[]): boolean {
  const p = String(pathname ?? "");
  return prefixes.some((prefixe) => p === prefixe || p.startsWith(`${prefixe}/`));
}

/** Normalise un `Host` : minuscules, sans port. */
export function hoteNormalise(raw: string | null | undefined): string {
  return String(raw ?? "").trim().toLowerCase().split(":")[0];
}

/**
 * Sert-on le JETON DE PROPRIÉTÉ sur cette page ?
 *
 * L'hôte suffit, et le chemin n'a rien à y faire : Google vient lire ce
 * jeton à la racine du domaine qu'il vérifie.
 *
 * `estHoteDeVente` est un PARAMÈTRE et non une lecture faite ici : la
 * liste des domaines de vente vit dans `lib/sales/salesHosts.ts`, et
 * deux listes qui disent la même chose finissent toujours par diverger.
 */
export function servirVerification(estHoteDeVente: boolean): boolean {
  return estHoteDeVente;
}

/**
 * Charge-t-on la MESURE d'audience ?
 *
 * Le domaine de vente, et le chemin en défense (voir ci dessus).
 *
 * **Le pathname doit être celui que le NAVIGATEUR voit.** Il est lu côté
 * client (`usePathname`) et pas dans un en-tête inventé : le middleware
 * n'en pose aucun, et un repli sur "/" chargerait la mesure sur tous les
 * quiz publics, c'est à dire exactement ce que cette fonction existe
 * pour empêcher.
 *
 * La vérification Search Console, elle, est une balise INERTE : elle ne
 * dépose rien et ne suit personne, donc elle n'attend aucun
 * consentement. Les deux ne se confondent pas.
 */
export function chargerAnalytics(params: {
  estHoteDeVente: boolean;
  pathname: string;
  consentementDonne?: boolean;
}): boolean {
  if (!params.estHoteDeVente) return false;
  if (estUnChemin(params.pathname, CHEMINS_DE_NOS_CLIENTES)) return false;
  if (GA_ATTEND_CONSENTEMENT && params.consentementDonne !== true) return false;
  return true;
}

/**
 * La balise de propriété, prête à insérer dans un `<head>` écrit à la
 * main.
 *
 * Rendue par une fonction et pas recopiée : le layout React et la page
 * de vente doivent poser EXACTEMENT la même chose, et deux écritures de
 * la même balise finissent toujours par diverger.
 */
export function baliseVerificationGoogle(): string {
  return `<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}">`;
}

/**
 * La mesure d'audience, pour un `<head>` écrit à la main.
 *
 * **Elle n'existe que pour la page de vente**, qui ne passe pas par le
 * layout React. Partout ailleurs c'est `components/analytics/
 * GoogleAnalytics.tsx` qui décide, parce qu'il a besoin du chemin que
 * voit le navigateur. Les deux chargent le même identifiant, écrit une
 * seule fois juste au dessus.
 */
export function scriptAnalyticsGoogle(): string {
  return [
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>`,
    `<script>`,
    `window.dataLayer = window.dataLayer || [];`,
    `function gtag(){dataLayer.push(arguments);}`,
    `gtag('js', new Date());`,
    `gtag('config', '${GA_MEASUREMENT_ID}');`,
    `</script>`,
  ].join("\n");
}
