// lib/trafic/vueNavigateur.ts
//
// LA VUE COMPTÉE PAR LE NAVIGATEUR, PARCE QUE LE SERVEUR NE LA VOIT PAS.
//
// Béné, 18 septembre 2026 : "mon trafic n'est absolument pas tracké,
// c'est impossible que je n'ai eu aucune visite mais que j'ai vendu
// quand même... comment faire confiance à un centre de pilotage ?"
//
// -- CE QUI A ÉTÉ MESURÉ, ET QUI TRANCHE -------------------------------
//
// Le 18 septembre, trois requêtes sur la production :
//
//   curl -sS -o /dev/null -D - https://tiquiz.fr/ -H "accept: text/html"
//   -> cache-control: max-age=300
//   -> cf-cache-status: HIT      age: 9
//
// **Cloudflare sert la page d'accueil depuis SON cache.** Une réponse
// servie par le cache ne touche jamais notre serveur : le middleware ne
// tourne pas, donc `signalerVue` n'est jamais appelé, donc la vue
// n'existe nulle part. Vérifié pareil sur `atelierduquiz.fr/` (HIT) et
// sur `/blog` (s-maxage=3600).
//
// Tout le reste de la chaîne était SAIN, et c'est ce qui rendait la
// panne invisible : la route interne répond (401 sans le secret, donc
// elle est joignable et `CRON_SECRET` est posé), la table `trafic_jour`
// est lisible (l'écran affiche des chiffres, pas son bloc "pas encore
// lisible"), le middleware tourne bien sur les pages dynamiques (il y
// pose ses cookies). Il n'y avait rien à réparer dans le code : il y
// avait un intermédiaire qui répondait avant lui.
//
// C'est MOT POUR MOT la règle du 31 août, celle des images en 403 :
// "quand un changement déplace l'endroit d'où quelque chose est SERVI,
// la dernière étape n'est pas d'écrire la configuration, c'est d'aller
// chercher l'URL et de lire le code de réponse". Le compteur a été
// écrit le 7 septembre sans que personne ne demande au serveur s'il
// voyait vraiment passer la page. Onze jours de zéro.
//
// -- POURQUOI LE NAVIGATEUR, ET PAS "ON ARRÊTE LE CACHE" ---------------
//
// Débrancher le cache de Cloudflare compterait tout le monde, et
// ralentirait le site pour de vrais visiteurs, sur des pages qui
// commencent à peine à ranker. On garde la vitesse : le HTML vient du
// cache, et le navigateur signale la vue dans une requête à part, qui
// elle n'est jamais mise en cache (c'est un POST).
//
// -- ET ON N'EN GARDE QU'UN SEUL ---------------------------------------
//
// Le comptage du middleware est RETIRÉ dans le même geste. Garder les
// deux compterait DEUX FOIS chaque page dynamique (le bon de commande,
// justement), et un chiffre faux dans un tableau de bord est pire qu'un
// chiffre absent : il fait prendre des décisions. Une mécanique, un
// endroit, comme pour tout le reste ici.
//
// -- CE QU'ON NE STOCKE TOUJOURS PAS -----------------------------------
//
// Ni IP, ni cookie, ni identifiant, ni empreinte : on incrémente un
// compteur par (jour, hôte, chemin, source). Rien ne désigne une
// personne, donc rien ne demande de consentement, donc le compteur voit
// AUSSI ceux qui refusent le bandeau. C'est ce qui le rend plus juste
// que GA4, et c'était déjà le choix du 7 septembre : il ne change pas.
//
// -- CE QU'IL MANQUE, ET ÇA S'ÉCRIT À L'ÉCRAN --------------------------
//
// Un bloqueur très agressif peut manger la requête. L'adresse est donc
// première partie et ne porte ni "track", ni "analytics", ni "collect",
// les trois mots que les listes de blocage reconnaissent. Ce qui reste
// se DIT sur l'écran, au lieu d'être promis comme exact.

import { cheminPourStats, estUnRobot } from "@/lib/trafic/vueASignaler";

/** Pourquoi cette vue compte, ou pourquoi elle ne compte pas. */
export type VerdictVueNavigateur =
  | { compte: true; hote: string; chemin: string }
  | { compte: false; raison: "hote_inconnu" | "hors_site" | "robot" | "chemin_invalide" };

/**
 * UNE REQUÊTE VENUE D'UNE PAGE À NOUS, OU PAS.
 *
 * DEUX PREUVES, ET IL EN FAUT UNE SEULE.
 *
 * 1. `sec-fetch-site: same-origin`, posé par le NAVIGATEUR et
 *    impossible à écrire depuis un script de page ;
 * 2. `origin`, qui sur un POST est envoyé par TOUS les navigateurs,
 *    même same-origin, et qui doit désigner NOTRE hôte.
 *
 * **Mon premier jet n'avait que la première, et il était faux.** Safari
 * ne pose `Sec-Fetch-*` que depuis la version 16.4 : tous les visiteurs
 * d'un iPhone un peu ancien auraient été refusés, silencieusement, et
 * le compteur aurait recommencé à sous compter sans que rien ne le
 * dise. C'est très exactement le défaut qu'on est en train de réparer.
 *
 * Aucune des deux n'est une preuve contre un outil en ligne de commande,
 * qui écrit ce qu'il veut, et ce n'est pas le but : le but est qu'une
 * page tierce qui inclurait notre adresse ne gonfle pas nos chiffres
 * sans le vouloir. Elle, son `origin` la désigne.
 *
 * Les DEUX absentes : refusé. Le sens du repli de tout ce fichier est
 * là. Une vue ratée est une ligne en moins ; une vue inventée est une
 * décision prise sur un chiffre faux.
 */
function vientDeChezNous(args: {
  secFetchSite: string | null | undefined;
  origin: string | null | undefined;
  hote: string;
}): boolean {
  if (String(args.secFetchSite ?? "").trim().toLowerCase() === "same-origin") return true;

  const brut = String(args.origin ?? "").trim();
  if (!brut) return false;
  let hoteOrigine = "";
  try {
    hoteOrigine = new URL(brut).hostname.toLowerCase();
  } catch {
    // Un `origin` illisible n'est pas une preuve : on ne devine pas.
    return false;
  }
  return Boolean(hoteOrigine) && hoteOrigine === args.hote;
}

/**
 * Cette requête de comptage vaut-elle une vue ?
 *
 * `hotesConnus` est un PARAMÈTRE OBLIGATOIRE, jamais une liste devinée
 * ici : Tiquiz et l'Atelier appellent cette même fonction avec LEURS
 * domaines, et la règle du 1er août dit que le compilateur doit refuser
 * un appelant qui se tait.
 */
export function vueNavigateurASignaler(args: {
  hote: string | null | undefined;
  chemin: string | null | undefined;
  secFetchSite: string | null | undefined;
  /** L'en-tête `origin` de la requête. Un POST le porte toujours. */
  origin: string | null | undefined;
  userAgent: string | null | undefined;
  hotesConnus: Readonly<Record<string, unknown>>;
}): VerdictVueNavigateur {
  const hote = String(args.hote ?? "").trim().toLowerCase().split(":")[0];
  if (!hote || !Object.prototype.hasOwnProperty.call(args.hotesConnus, hote)) {
    return { compte: false, raison: "hote_inconnu" };
  }
  if (!vientDeChezNous({ secFetchSite: args.secFetchSite, origin: args.origin, hote })) {
    return { compte: false, raison: "hors_site" };
  }
  if (estUnRobot(args.userAgent)) return { compte: false, raison: "robot" };

  const brut = String(args.chemin ?? "").trim();
  // Un chemin qui ne commence pas par `/` n'est pas un chemin : c'est
  // une URL complète, ou n'importe quoi. On ne devine pas.
  if (!brut.startsWith("/")) return { compte: false, raison: "chemin_invalide" };
  // Un fichier n'est pas une page. Même garde que côté middleware, et
  // pour la même raison : la cardinalité de la table.
  if (/\.[a-z0-9]{2,5}$/i.test(brut)) return { compte: false, raison: "chemin_invalide" };

  return { compte: true, hote, chemin: cheminPourStats(brut) };
}
