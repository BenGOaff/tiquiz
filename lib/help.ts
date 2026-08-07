// lib/help.ts
//
// L'ADRESSE DU CENTRE D'AIDE VIT ICI, ET NULLE PART AILLEURS.
//
// Le centre d'aide de Tiquiz est servi par Tipote (`app.tipote.com`),
// parce que les deux apps partagent la même base d'articles. Son adresse
// était donc écrite en dur à trois endroits de Tiquiz : la sidebar, le
// formulaire de création, et le panneau Systeme.io des paramètres.
//
// C'est exactement le motif du drame de l'Atelier (3 août 2026) : une
// URL écrite en dur à plusieurs endroits ne se corrige jamais qu'à
// moitié. Là-bas, un rebrand avait cassé le retour d'un OAuth et on
// n'avait réparé qu'un côté de la chaîne.
//
// -- ET LA LANGUE ------------------------------------------------------
//
// Audit de l'aide, 6 août 2026 : la langue de Tipote vient d'un cookie
// posé sur SON domaine. Une cliente Tiquiz n'a pas de compte Tipote,
// donc pas de cookie : elle cliquait sur "Ayuda" et lisait les 57
// articles en français. C'est ici qu'on ajoute `?lang=`, parce que
// c'est Tiquiz qui sait dans quelle langue elle travaille (mieux que
// l'entête de son navigateur, qui peut dire autre chose).

const HELP_BASE = "https://app.tipote.com/support";

/**
 * Le lien vers le centre d'aide, dans la langue de l'interface.
 *
 * `path` est un chemin RELATIF au centre d'aide :
 *   - `""`                        -> l'accueil de l'aide
 *   - `"tiquiz"`                  -> la catégorie Tiquiz
 *   - `"article/tiquiz-systeme-io"` -> un article précis
 */
export function helpUrl(locale: string, path = "tiquiz"): string {
  const clean = path.replace(/^\/+/, "");
  const base = clean ? `${HELP_BASE}/${clean}` : HELP_BASE;
  // `locale` vient de next-intl, donc de notre propre liste : pas de
  // validation ici, mais un encodage, parce que c'est une query string.
  return `${base}?lang=${encodeURIComponent(locale)}`;
}
