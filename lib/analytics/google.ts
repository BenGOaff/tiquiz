// lib/analytics/google.ts (Tiquiz)
//
// LES OUTILS GOOGLE : OÙ ILS SE CHARGENT, ET SURTOUT OÙ ILS NE SE
// CHARGENT PAS.
//
// Béné, 26 août 2026 : "tu peux ajouter ça pour que je puisse suivre les
// performances sur les outils Google ?"
//
// -- POURQUOI CE N'EST PAS "UNE BALISE DANS LE LAYOUT" -----------------
//
// Notre `<head>` est servi sur TROIS familles de domaines :
//
//   1. les nôtres (tiquiz.fr, quiz.tipote.com) ;
//   2. le DOMAINE PERSONNALISÉ d'une créatrice (example.com), que le
//      portier des domaines personnalisés laisse passer ;
//   3. la même app, en local et en préversion.
//
// Poser la balise partout aurait deux conséquences que personne n'aurait
// vues avant longtemps :
//
// - **le jeton de vérification sur le domaine d'une cliente** permettrait
//   à Béné de revendiquer CE domaine dans sa Search Console, et donc de
//   voir les données de recherche de sa cliente. Ce n'est pas une faille
//   technique, c'est une capacité qu'on ne veut pas ouvrir par accident ;
// - **la mesure d'audience sur les quiz publics** mélangerait le trafic
//   des VISITEURS DE SES CLIENTES avec le sien. Ses chiffres à elle
//   (combien arrivent sur la page de vente, combien s'inscrivent)
//   deviendraient illisibles, noyés dans un trafic qui ne lui appartient
//   pas. Et le trafic des quiz est déjà mesuré, mieux et sans cookie, par
//   `quiz_events`.
//
// **Règle : Google mesure NOS pages, jamais les quiz de nos clientes.**
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
 * `/q` et `/s` sont les quiz publics (le second est la réécriture d'un
 * slug nu sur un domaine personnalisé), `/embed` est le quiz affiché
 * dans un iframe SUR LE SITE DE LA CLIENTE. Cet iframe est servi par
 * notre domaine, donc le seul contrôle de l'hôte ne suffirait pas à
 * l'exclure : c'est bien le CHEMIN qui dit à qui appartient l'audience.
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
 * jeton à la racine du domaine qu'il vérifie. Ce qu'on protège ici,
 * c'est uniquement de le servir sur le domaine d'une créatrice.
 *
 * `estNotreHote` est un PARAMÈTRE et non une lecture faite ici : la
 * liste de nos domaines vit dans `lib/customDomains.ts`, et deux listes
 * qui disent la même chose finissent toujours par diverger.
 */
export function servirVerification(estNotreHote: boolean): boolean {
  return estNotreHote;
}

/**
 * Charge-t-on la MESURE d'audience ?
 *
 * Ici le CHEMIN compte, et c'est toute la différence avec la balise de
 * propriété : `/embed` est servi par NOTRE domaine mais s'affiche dans
 * un iframe sur le site de la cliente, donc l'audience est la sienne.
 * Le seul contrôle de l'hôte ne l'exclurait pas.
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
  estNotreHote: boolean;
  pathname: string;
  consentementDonne?: boolean;
}): boolean {
  if (!params.estNotreHote) return false;
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
