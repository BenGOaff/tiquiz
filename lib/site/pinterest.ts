// lib/site/pinterest.ts
//
// LA REVENDICATION DU DOMAINE CHEZ PINTEREST.
//
// Béné, 1er septembre 2026 : "tu peux vérifier mon domaine sur le
// domaine tiquiz ?"
//
// Revendiquer le domaine sert trois choses, et la troisième est celle
// qu'elle cherche : son nom et sa photo s'affichent sur CHAQUE épingle
// qui vient de tiquiz.fr (même celles épinglées par quelqu'un d'autre),
// elle voit les statistiques de ce qui circule, et Pinterest fait
// remonter les épingles d'un domaine revendiqué.
//
// -- CE QU'ON NE PEUT PAS DEVINER --------------------------------------
//
// Le code est propre à SON compte : Pinterest le fabrique quand elle
// ouvre la fenêtre de revendication. Il n'existe nulle part ailleurs,
// donc il ne peut pas être écrit dans le dépôt à l'avance. Il vit dans
// `PINTEREST_DOMAIN_VERIFY`, et il est lu À CHAQUE RENDU : elle le pose
// dans le `.env` du serveur et redémarre, sans rebuild.
//
// -- ON VALIDE, ON NE FAIT PAS CONFIANCE -------------------------------
//
// C'est la règle du 2 août : un `??` protège du MANQUANT, jamais du
// FAUX. Une variable collée avec les guillemets de Pinterest autour, ou
// la balise `<meta>` entière recopiée par erreur, produirait une balise
// que Pinterest refuse, et RIEN à l'écran ne le dirait : la
// revendication échouerait en silence, ce qui est exactement le genre
// de panne qu'on ne découvre que des mois plus tard.
//
// Le format est celui que Pinterest émet : des lettres et des chiffres,
// rien d'autre. Une valeur qui n'y ressemble pas est ignorée, et le
// contrôle de démarrage le dit dans le journal.

/** Ce que Pinterest écrit dans son `content` : de l'alphanumérique. */
const FORME = /^[a-z0-9]{16,64}$/i;

/**
 * Le code de revendication, ou `null`.
 *
 * `null` retire la balise au lieu d'en poser une fausse. Une balise
 * `p:domain_verify` vide ou mal formée est pire que pas de balise :
 * Pinterest la lit, la refuse, et la revendication reste en échec
 * pendant qu'on croit l'avoir faite.
 */
export function codeVerificationPinterest(
  brut: string | null | undefined = process.env.PINTEREST_DOMAIN_VERIFY,
): string | null {
  const valeur = String(brut ?? "").trim();
  if (!valeur) return null;
  // On tolère qu'elle ait collé la balise entière : c'est ce que
  // Pinterest met dans le presse papier, donc c'est l'erreur la plus
  // probable, et la refuser sans rien dire l'enverrait chercher au
  // mauvais endroit.
  const dansUneBalise = valeur.match(/content\s*=\s*["']([^"']+)["']/i);
  const candidat = (dansUneBalise?.[1] ?? valeur).trim().replace(/^["']|["']$/g, "");
  return FORME.test(candidat) ? candidat : null;
}

/**
 * Ce qui a été reçu, mais mal formé : de quoi le DIRE sans l'imprimer.
 *
 * Un code de revendication n'est pas un secret, mais un rapport de
 * démarrage finit dans un terminal et dans un historique : on dit la
 * longueur, pas la valeur (règle du 22 août).
 */
export function diagnosticVerificationPinterest(
  brut: string | null | undefined = process.env.PINTEREST_DOMAIN_VERIFY,
): string | null {
  const valeur = String(brut ?? "").trim();
  if (!valeur) return null;
  if (codeVerificationPinterest(valeur)) return null;
  return `PINTEREST_DOMAIN_VERIFY est posee mais illisible (${valeur.length} caracteres). Attendu : le contenu du champ "content" de la balise donnee par Pinterest, en lettres et chiffres.`;
}
