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
 * LA BALISE ATTEND LE CONSENTEMENT (26 août 2026).
 *
 * Le commentaire ci-dessus disait "il n'y a aucun bandeau cookies dans
 * cette app". C'était vrai de l'APP, et faux là où la balise se charge :
 * les pages de vente portent le bandeau de Béné depuis le début, avec
 * son propre GA4 posé seulement après accord.
 *
 * On avait donc, sur `tiquiz.fr`, un bandeau qui demande la permission
 * et une balise qui ne l'attendait pas. Un bandeau qu'on contourne
 * n'est pas un détail juridique : c'est un bandeau qui ment à la
 * personne qui vient de cliquer "refuser".
 */
export const GA_ATTEND_CONSENTEMENT = true;

/** Là où le bandeau de Béné range le choix de la personne. */
export const CLE_CONSENTEMENT = "aq_consent_v1";

/** Combien de jours le bandeau mémorise ce choix (`CFG.memoire`). */
export const MEMOIRE_CONSENTEMENT_JOURS = 182;

/**
 * La personne a-t-elle accepté la MESURE ?
 *
 * Fonction pure : elle prend ce qui est stocké, pas le navigateur, donc
 * elle se teste. Le bandeau écrit `{mesure, pub, video, t}` et oublie
 * le choix passé `CFG.memoire` jours ; on relit la même règle, sinon on
 * mesurerait encore quelqu'un dont l'accord a expiré côté bandeau.
 *
 * Tout ce qui n'est pas un OUI franc est un NON : rien de stocké, JSON
 * illisible, horodatage absent ou périmé. Sur un consentement, le doute
 * ne profite jamais à la mesure.
 */
export function consentementMesure(
  brut: string | null | undefined,
  maintenant: number = Date.now(),
  memoireJours: number = MEMOIRE_CONSENTEMENT_JOURS,
): boolean {
  if (!brut) return false;
  let objet: unknown;
  try {
    objet = JSON.parse(brut);
  } catch {
    return false;
  }
  if (!objet || typeof objet !== "object") return false;
  const o = objet as { mesure?: unknown; t?: unknown };
  if (typeof o.t !== "number" || !Number.isFinite(o.t)) return false;
  if (maintenant - o.t > memoireJours * 864e5) return false;
  return o.mesure === true;
}

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
 * LA BALISE GOOGLE, EXACTEMENT CELLE QUE GOOGLE DONNE.
 *
 * Béné, 26 août 2026, en collant le bloc pour la troisième fois : "tu
 * vois bien que ce qui est demandé n'est pas ce que tu as mis ???"
 *
 * Elle a raison. La version précédente réécrivait l'identifiant DANS le
 * bandeau cookies de la page au lieu de poser la balise, parce que le
 * bandeau charge déjà GA4 après consentement et que Google demande une
 * seule balise par page. C'était un raisonnement défendable, et ce
 * n'était pas ce qui était demandé.
 *
 * **Le bloc ci-dessous est celui de Google, au caractère près**, y
 * compris son commentaire d'ouverture et sa ligne vide. Le recopier tel
 * quel n'est pas de la paresse : c'est ce qui permet de comparer d'un
 * coup d'oeil ce que Google affiche et ce que la page sert.
 *
 * -- CE QUI RESTE VRAI, ET QUI EST SA DÉCISION -------------------------
 *
 * La page de vente porte AUSSI le bandeau cookies de Béné
 * (`__AQ_COOKIES__` / `aqc-banniere`), qui charge `G-HRCMDXGTQD` après
 * consentement. Il n'est pas touché : c'est sa page, et on n'y modifie
 * pas ce qu'elle a écrit sans qu'elle le demande. La page porte donc
 * deux mesures, et c'est un choix assumé, pas un oubli.
 */
/**
 * LE MODE CONSENTEMENT DE GOOGLE, POSÉ AVANT LA BALISE.
 *
 * Béné, 26 août 2026 : "faut mettre ce qu'il faut là où il faut
 * qu'est-ce que j'en sais moi ?"
 *
 * -- LE VRAI DÉFAUT N'ÉTAIT PAS CELUI QU'ON CROYAIT ------------------
 *
 * La page de vente portait DEUX propriétés GA4 : la nôtre, chargée
 * toujours, et celle du bandeau cookies, chargée après accord. Deux
 * chiffres pour la même page, donc aucun des deux n'est croyable.
 *
 * Mais le plus grave était l'autre moitié : **un bandeau qui demande la
 * permission et une balise qui ne l'attend pas**. La personne clique
 * "refuser" et on la mesure quand même. Ce n'est pas un détail
 * juridique, c'est un bandeau qui ment à qui vient de cliquer.
 *
 * -- POURQUOI LE MODE CONSENTEMENT, ET PAS UN GATE MAISON ------------
 *
 * C'est exactement ce que l'écran de Google indique ("si vous avez des
 * utilisateurs finaux dans l'EEE, configurez le mode Consentement"), et
 * c'est la seule solution qui **laisse la balise INTACTE**. Elle reste
 * au caractère près celle que Google donne ; ce qui change, c'est
 * qu'elle ne dépose rien tant que l'accord n'est pas là.
 *
 * Le bandeau de Béné écrit `{mesure, pub, video, t}` dans
 * `aq_consent_v1` et oublie le choix au bout de `CFG.memoire` jours. On
 * relit SA règle, sinon on mesurerait encore quelqu'un dont l'accord a
 * expiré de son côté.
 *
 * Il n'émet aucun événement, et `storage` ne se déclenche pas dans
 * l'onglet qui écrit : on se raccroche au clic, puisqu'un consentement
 * est toujours donné par un clic. L'écouteur se retire dès qu'il a sa
 * réponse.
 */
export function scriptConsentementGoogle(): string {
  return [
    "<script>",
    "  window.dataLayer = window.dataLayer || [];",
    "  function gtag(){dataLayer.push(arguments);}",
    "  gtag('consent', 'default', {",
    "    ad_storage: 'denied',",
    "    ad_user_data: 'denied',",
    "    ad_personalization: 'denied',",
    "    analytics_storage: 'denied',",
    "    wait_for_update: 500",
    "  });",
    "  (function(){",
    `    var CLE = '${CLE_CONSENTEMENT}';`,
    `    var MEMOIRE = ${MEMOIRE_CONSENTEMENT_JOURS};`,
    "    function accepte(){",
    "      try {",
    "        var o = JSON.parse(localStorage.getItem(CLE));",
    "        if (!o || typeof o.t !== 'number') return false;",
    "        if (Date.now() - o.t > MEMOIRE * 864e5) return false;",
    "        return o.mesure === true;",
    "      } catch (e) { return false; }",
    "    }",
    "    function accorder(){",
    "      gtag('consent', 'update', { analytics_storage: 'granted' });",
    "    }",
    "    if (accepte()) { accorder(); return; }",
    "    function surClic(){",
    "      setTimeout(function(){",
    "        if (accepte()) {",
    "          accorder();",
    "          document.removeEventListener('click', surClic, true);",
    "        }",
    "      }, 0);",
    "    }",
    "    document.addEventListener('click', surClic, true);",
    "  })();",
    "</script>",
  ].join("\n");
}

export function scriptAnalyticsGoogle(): string {
  return [
    `<!-- Google tag (gtag.js) -->`,
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>`,
    `<script>`,
    `  window.dataLayer = window.dataLayer || [];`,
    `  function gtag(){dataLayer.push(arguments);}`,
    `  gtag('js', new Date());`,
    ``,
    `  gtag('config', '${GA_MEASUREMENT_ID}');`,
    `</script>`,
  ].join("\n");
}
