// tests/logic/aide/pageDuSite.mts
//
// OU VIT LA PAGE D'UNE ADRESSE DU SITE, CHERCHEE ET PAS RECOPIEE.
//
// Les groupes de routes de Next (les parentheses) n'ajoutent aucun
// segment d'URL : `/tarifs` peut vivre dans `app/(site)/tarifs/` ou dans
// `app/(site-langues)/tarifs/` sans que l'adresse bouge d'un caractere.
//
// Un test qui ECRIT ce chemin en dur casse donc au premier deplacement,
// sur un code parfaitement correct. C'est arrive le 8 septembre : deux
// fichiers de tests portaient `app/(site)/tarifs/page.tsx`, et le
// passage de `/tarifs` dans son propre groupe (pour qu'il puisse lire la
// langue de l'adresse sans rendre dynamiques les 8 pages voisines) les a
// fait rougir tous les deux.
//
// On CHERCHE donc, et on refuse les deux cas qui comptent :
//   - introuvable : la page a vraiment disparu, le test doit rougir ;
//   - trouvee deux fois : deux groupes serviraient la MEME URL, ce que
//     Next refuse au build. Le dire ici le dit plus tot.

import fs from "node:fs";
import path from "node:path";

const RACINE = path.resolve(import.meta.dirname, "../../..");

/** Le chemin sur disque de la page qui sert `<chemin>`, relatif a la racine. */
export function cheminPageDuSite(chemin: string): string {
  const nu = chemin.replace(/^\/+/, "");
  const app = path.join(RACINE, "app");

  const candidats: string[] = [];
  const direct = path.join("app", nu, "page.tsx");
  if (fs.existsSync(path.join(RACINE, direct))) candidats.push(direct);

  for (const e of fs.readdirSync(app, { withFileTypes: true })) {
    if (!e.isDirectory() || !e.name.startsWith("(")) continue;
    const rel = path.join("app", e.name, nu, "page.tsx");
    if (fs.existsSync(path.join(RACINE, rel))) candidats.push(rel);
  }

  if (candidats.length === 0) throw new Error(`aucune page ne sert ${chemin}`);
  if (candidats.length > 1) {
    throw new Error(`${chemin} est servi par ${candidats.length} pages : ${candidats.join(", ")}`);
  }
  return candidats[0];
}

/** Le contenu de cette page. */
export function sourcePageDuSite(chemin: string): string {
  return fs.readFileSync(path.join(RACINE, cheminPageDuSite(chemin)), "utf8");
}
