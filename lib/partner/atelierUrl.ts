// lib/partner/atelierUrl.ts
//
// LE DOMAINE DE L'ATELIER DU QUIZ, ÉCRIT UNE SEULE FOIS.
//
// Drame du 3 août 2026. Béné : "j'ai voulu rebasculer de Tipote à Tiquiz
// sur l'Atelier et ça a foiré. J'ai bien la demande d'autorisation de
// connexion mais derrière je tombe sur la page d'erreur."
//
// Le consentement marchait. C'est le RETOUR qui tombait dans le vide :
// Tiquiz renvoyait l'élève vers `formaquiz.tipote.com`, un hostname que
// plus rien ne sert depuis le rebrand "quizing" du 18 juin. Vérifié le
// jour même : `formaquiz.tipote.com` répond 404, `quizing.tipote.com`
// répond bien (307 vers /login, donc l'app est là).
//
// C'EST LA DEUXIÈME MOITIÉ DU MÊME DRAME. Le rebrand avait déjà cassé
// l'aller (lib/integrations/tiquiz.ts, côté Atelier : le lien pointait
// vers /connect/quizing qui n'existait pas). On avait corrigé l'aller
// sans voir que le RETOUR portait la même adresse périmée, à l'autre bout
// de la chaîne et dans l'autre repo. Une URL écrite en dur à deux
// endroits ne se corrige jamais qu'à moitié.
//
// D'où ce module : le domaine vit ICI, et nulle part ailleurs.

/**
 * Domaine canonique de l'Atelier du Quiz.
 *
 * `formaquiz.tipote.com` est l'ANCIEN nom, mort depuis le 18 juin 2026.
 * Ne jamais le réintroduire : il renvoie 404.
 */
export const ATELIER_BASE_URL = "https://quizing.tipote.com";

/**
 * LE NOM DU PRODUIT, TEL QUE L'ÉLÈVE LE CONNAÎT.
 *
 * Retour Béné, 4 août 2026 : "la page de connexion demande de valider la
 * connexion à Formaquiz ??? C'est l'Atelier du Quiz depuis des lustres !"
 *
 * "FormaQuiz" est un nom de code interne, encore partout dans le code
 * (routes, variables d'environnement, colonne `partner`). Ça, ce n'est pas
 * grave : personne ne le voit. Ce qui l'était, c'est qu'il avait fui dans
 * l'écran de consentement, c'est à dire sur le SEUL écran où l'élève doit
 * reconnaître à qui elle donne accès à ses statistiques. Un nom inconnu à
 * ce moment là, ça ressemble à du hameçonnage.
 *
 * Même raison d'être que la constante du dessus : le nom vit ICI, et le
 * jour où il change, il change à un seul endroit.
 */
export const ATELIER_NAME = "L'Atelier du Quiz";

/**
 * URL de retour du consentement, surchargeable par l'environnement.
 *
 * Elle reste FIXE et n'est jamais lue depuis la requête : un `redirect_uri`
 * fourni par l'appelant serait une redirection ouverte, donc un moyen de
 * détourner un code d'autorisation.
 *
 * La surcharge est validée : une valeur vide ou qui n'est pas une adresse
 * https retombe sur le domaine canonique. Un `??` seul ne protège que de
 * la variable ABSENTE, jamais de la variable FAUSSE, et c'est précisément
 * ce qui avait envoyé les liens de mot de passe sur localhost (drame
 * Véronique du 2 août).
 */
export function atelierConnectCallback(): string {
  const raw = (process.env.FORMAQUIZ_CONNECT_CALLBACK ?? "").trim();
  if (/^https:\/\/\S+$/i.test(raw)) return raw;
  if (raw) {
    console.warn("[partner] FORMAQUIZ_CONNECT_CALLBACK ignorée (pas une URL https) :", raw);
  }
  return `${ATELIER_BASE_URL}/api/integrations/tiquiz/callback`;
}
