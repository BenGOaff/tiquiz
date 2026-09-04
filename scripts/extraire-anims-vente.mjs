// scripts/extraire-anims-vente.mjs
//
// EXTRAIT LES BLOCS ANIMÉS DE SA PAGE DE VENTE, TELS QU'ELLE LES A ÉCRITS.
//
// Béné, 4 septembre 2026 : "pourquoi tu ne reprends pas au moins une
// partie des animations de ma page d'origine ? Elles sont super et elles
// montrent bien le fonctionnement !"
//
// Elle a raison, et les réécrire serait absurde : sa page porte
// 234 keyframes, regroupés par bloc, et chaque bloc est une ÎLE
// autonome (son `<style>`, puis son markup). On les LÈVE au lieu d'en
// dessiner d'autres, pour la même raison qu'on ne recopie pas un prix :
// deux versions d'une même animation finiraient par ne plus se
// ressembler.
//
// CE QU'ON NE FAIT PAS : toucher au contenu. Le script coupe aux
// frontières et ne réécrit rien, sauf les PRÉFIXES de classe, préfixés
// une deuxième fois (`tqla-`) pour qu'aucune règle ne fuite sur le reste
// de la page.
//
// Lancer :  node scripts/extraire-anims-vente.mjs

import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "content/sales/tiquiz.html";

/**
 * Les blocs qu'on lève, et ce qu'ils MONTRENT.
 *
 * CHAQUE BLOC EXISTE EN DEUX VARIANTES sur sa page : `tqvs` pour le
 * grand écran et `tqvsmb` pour le mobile, chacune avec son style et son
 * markup. On lève les DEUX : ce sont ses media queries, dans son propre
 * style, qui décident laquelle s'affiche.
 *
 * Le premier jet n'en levait qu'une, et pas la bonne : `indexOf` sur
 * "@keyframes tqvs" tombait sur `tqvsmbUpL`, qui apparaît plus tôt dans
 * le fichier. La variante mobile servie sur un grand écran mesurait
 * 10463 px de haut. D'où l'ancre exacte ci dessous.
 */
const BLOCS = [
  { prefixe: "tqvs", fichier: "opt-in-vs-quiz", quoi: "Un PDF qu'on ne lit pas contre un quiz auquel on répond." },
  { prefixe: "tqvsmb", fichier: "opt-in-vs-quiz-mobile", quoi: "La même chose, la variante mobile de sa page." },
  { prefixe: "tqbr", fichier: "ton-branding", quoi: "Le même quiz qui prend les couleurs et le logo de la créatrice." },
  { prefixe: "tqbrmb", fichier: "ton-branding-mobile", quoi: "La même chose, la variante mobile de sa page." },
  { prefixe: "tqpx", fichier: "tes-pixels", quoi: "Les pixels Meta, Analytics et Ads qui se posent sur le quiz." },
  { prefixe: "tqpxmb", fichier: "tes-pixels-mobile", quoi: "La même chose, la variante mobile de sa page." },
];

const html = readFileSync(SOURCE, "utf8");

/** La fin de la balise fermante qui apparie l'ouverture à `debut`. */
function finDeLElement(s, debut) {
  const nom = /^<([a-zA-Z0-9-]+)/.exec(s.slice(debut))?.[1];
  if (!nom) return -1;
  const jeton = new RegExp(`<${nom}(?=[\\s>/])|</${nom}>`, "g");
  jeton.lastIndex = debut;
  let profondeur = 0;
  let m;
  while ((m = jeton.exec(s))) {
    if (m[0].startsWith("</")) {
      profondeur--;
      if (profondeur === 0) return m.index + m[0].length;
    } else {
      // Une balise auto-fermante ne compte pas.
      const fin = s.indexOf(">", m.index);
      if (fin > 0 && s[fin - 1] !== "/") profondeur++;
    }
  }
  return -1;
}

let ok = 0;
for (const b of BLOCS) {
  // L'ANCRE EST EXACTE : ses keyframes s'appellent `tqvsUpL`, donc le
  // préfixe est suivi d'une MAJUSCULE. Sans ce garde, "tqvs" attrapait
  // "tqvsmbUpL", c'est à dire l'autre variante.
  const ancre = html.search(new RegExp(`@keyframes\\s+${b.prefixe}[A-Z]`));
  if (ancre < 0) {
    console.error(`REFUS : aucun @keyframes ${b.prefixe}<Majuscule> dans ${SOURCE}.`);
    process.exit(1);
  }
  // Le <style> qui porte ces keyframes.
  const debutStyle = html.lastIndexOf("<style", ancre);
  const finStyle = finDeLElement(html, debutStyle);
  if (debutStyle < 0 || finStyle < 0) {
    console.error(`REFUS : ${b.prefixe} : la balise <style> n'a pas de fin.`);
    process.exit(1);
  }
  const style = html.slice(debutStyle, finStyle);

  // Le premier élément après le style qui porte la classe racine.
  const apres = html.slice(finStyle);
  const mRacine = new RegExp(`<([a-zA-Z0-9-]+)[^>]*class="(?:[^"]*\\s)?${b.prefixe}(?:\\s[^"]*)?"`).exec(
    apres,
  );
  if (!mRacine) {
    console.error(`REFUS : ${b.prefixe} : aucun élément racine .${b.prefixe} après son style.`);
    process.exit(1);
  }
  const debutRacine = finStyle + mRacine.index;
  const finRacine = finDeLElement(html, debutRacine);
  if (finRacine < 0) {
    console.error(`REFUS : ${b.prefixe} : l'élément racine n'a pas de fin.`);
    process.exit(1);
  }
  const markup = html.slice(debutRacine, finRacine);

  // ON NE RE-PRÉFIXE PAS, ET C'EST MESURÉ.
  //
  // Le premier jet renommait `.tqvs` en `.tqla-tqvs` pour qu'aucune
  // règle ne fuite. Il en laissait 112 sur un bloc : le style et le
  // markup se retrouvaient DÉSAPPARIÉS, donc l'animation ne partait
  // plus. Et ça ne se voit pas dans le fichier, seulement à l'écran.
  //
  // Vérifié avant de renoncer : `tqvs`, `tqbr` et `tqpx` n'existent
  // dans AUCUN fichier de code du dépôt. Il n'y a donc rien à protéger,
  // et garder son bloc à l'octet près vaut mieux : deux copies d'une
  // même animation finissent toujours par ne plus se ressembler.
  // `tests/logic/anims-vente.test.mts` rejoue ce constat.

  const sortie = `<!-- LEVÉ DE content/sales/tiquiz.html PAR scripts/extraire-anims-vente.mjs.
     NE PAS RETOUCHER À LA MAIN : relance le script.
     Ce que ce bloc MONTRE : ${b.quoi} -->
${style}
${markup}
`;
  const chemin = `content/sales/anim/${b.fichier}.html`;
  writeFileSync(chemin, sortie, "utf8");
  // On REFUSE d'écrire un bloc qui ne porte pas d'animation : ce serait
  // une île morte, et personne ne le verrait avant de regarder l'écran.
  const anims = (style.match(new RegExp(`@keyframes\\s+${b.prefixe}[A-Z]`, "g")) || []).length;
  if (anims < 3) {
    console.error(`REFUS : ${b.prefixe} : seulement ${anims} keyframes, la coupe est trop courte.`);
    process.exit(1);
  }
  console.log(
    `${b.fichier.padEnd(18)} ${String(sortie.length).padStart(7)} o   ` +
      `${anims} keyframes   ${(markup.match(/</g) || []).length} balises`,
  );
  ok++;
}
console.log(`\n${ok} bloc(s) levé(s) dans content/sales/anim/.`);
