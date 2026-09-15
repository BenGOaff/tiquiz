// lib/integrations/retourOauth.ts
//
// D'OÙ VIENT UN RETOUR OAUTH, ET CE QU'ON EN FAIT (14 septembre 2026).
//
// Deux chemins mènent à `/api/connexions/crm-oauth/callback`, et ils
// ne se ressemblent pas :
//
// 1. NOTRE bouton. On a tiré un `state`, posé dans un cookie, et
//    GoHighLevel nous le rend : le code s'échange tout de suite.
// 2. Une installation lancée CHEZ EUX : le lien de test d'une version,
//    le bouton "Install" de leur Marketplace, l'installation en masse
//    d'une agence. Ces chemins n'ont jamais vu notre `state`, ils
//    arrivent avec le code seul. C'est le parcours "un clic" de
//    Quizify, et c'est celui que les clients emprunteront.
//
// Le deuxième cas est le seul qui demande une CONFIRMATION avant
// d'écrire quoi que ce soit. Sans `state`, rien ne prouve que la
// personne connectée à Tiquiz est celle qui vient de cliquer chez
// GoHighLevel : n'importe qui pourrait fabriquer un code depuis SON
// sous-compte et faire atterrir l'adresse chez quelqu'un d'autre. Le
// résultat serait une connexion vers un sous-compte inconnu, et si
// elle devient celle par défaut, ce sont ses leads qui y partent.
// Un écran qui NOMME le geste et demande un clic ferme ce trou : le
// code attend dans un cookie de cinq minutes, et l'échange ne se fait
// que sur un POST venu de notre propre page.
//
// Un `state` PRÉSENT qui ne correspond pas n'est jamais rattrapé par le
// chemin 2 : c'est un retour de notre bouton dont le cookie a expiré ou
// a été altéré, et il se refuse.

export type GenreRetourOauth = "notre-bouton" | "depuis-le-fournisseur" | "invalide";

export const COOKIE_CODE_GHL = "tq_ghl_code";
/** Le temps laissé pour cliquer "Relier" : un code OAuth ne vit que quelques minutes. */
export const DUREE_CODE_SECONDES = 300;

/** Un code OAuth est un jeton opaque court : on borne sa forme avant de le ranger dans un cookie. */
export function estUnCodeOauth(code: string): boolean {
  return /^[A-Za-z0-9._~-]{8,512}$/.test(code);
}

export function classerRetourOauth(a: { code: string; state: string; attendu: string }): GenreRetourOauth {
  const code = String(a.code ?? "").trim();
  const state = String(a.state ?? "").trim();
  const attendu = String(a.attendu ?? "").trim();
  if (!estUnCodeOauth(code)) return "invalide";
  if (state) return attendu && state === attendu ? "notre-bouton" : "invalide";
  return "depuis-le-fournisseur";
}
