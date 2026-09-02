#!/usr/bin/env node
// scripts/construire-page-vente-v2.mjs
//
// CONSTRUIT LA VERSION DE TRAVAIL DE LA PAGE DE VENTE.
//
//     npm run vente:v2            construit content/sales/tiquiz-v2.html
//     npm run vente:v2 -- --verifie   dit ce qu'il ferait, n'ecrit rien
//
// Il ne DÉCIDE rien : tout le plan vit dans `lib/sales/planV2.ts`, en
// module pur et testé. Ce fichier ne fait que découper, replacer et
// recoller, et il REFUSE de finir en silence.
//
// -- LES CINQ REFUS, ET CE QUE CHACUN A ÉVITÉ --------------------------
//
// 1. une section de la capture absente du plan -> ARRÊT. Elle
//    disparaîtrait de la v2 sans un mot, et personne ne le verrait
//    avant que Béné ne remarque qu'il manque un morceau.
// 2. un id du plan absent de la capture -> ARRÊT. C'est le cas d'une
//    nouvelle capture où Systeme.io a régénéré ses ids.
// 3. un fichier de bloc neuf manquant -> ARRÊT.
// 4. une correction de texte qui ne trouve pas sa cible -> ARRÊT.
//    C'est la leçon de `faitsProgramme.ts` (31 août) : une passe qui ne
//    mord pas et se tait laisse le contenu faux en annoncant qu'il est
//    propre.
// 5. le popup de la vente bêta introuvable -> ARRÊT. Le retirer est une
//    demande explicite, pas un effet de bord.
// 6. le bundle Systeme.io ou l'un de ses états introuvable -> ARRÊT.
//    Sans son retrait, la page servie est ignorée et REMPLACÉE par le
//    modèle : l'ordre revient, les blocs neufs disparaissent, le popup
//    revient. Et rien à l'écran ne le dirait.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RACINE = process.cwd();
const SOURCE = path.join(RACINE, "content/sales/tiquiz.html");
const CIBLE = path.join(RACINE, "content/sales/tiquiz-v2.html");
const DOSSIER_BLOCS = path.join(RACINE, "content/sales/v2");
const VERIFIE = process.argv.includes("--verifie");

const plan = await import(pathToFileURL(path.join(RACINE, "lib/sales/planV2.ts")).href);
const { ORDRE_V2, POPUP_BETA, CORRECTIONS_V2, SCRIPTS_RETIRES, verifierPlan } = plan;

function meurs(quoi) {
  console.error("\n❌ " + quoi + "\n");
  process.exit(1);
}

/** L'enveloppe commune aux 19 sections, MESURÉE et pas supposée. */
const OUVRE = '<div class="sc-iHGNWg iintFh">';
const FERME = "</div>";

/**
 * Découpe la page en blocs déplaçables.
 *
 * On apparie les `<section>` par une PILE, jamais par une expression
 * régulière gloutonne : plusieurs sections de cette page en contiennent
 * d'autres, et un `.*?` non apparié couperait au milieu.
 */
function decouper(html) {
  const re = /<section\b[^>]*>|<\/section>/gi;
  let m, pile = 0, debut = 0;
  const blocs = [];
  while ((m = re.exec(html))) {
    if (m[0][1] !== "/") { if (pile === 0) debut = m.index; pile++; }
    else {
      pile--;
      if (pile === 0) {
        const fin = re.lastIndex;
        const id = /id="([^"]+)"/.exec(html.slice(debut, debut + 300))?.[1] ?? null;
        const avecEnveloppe = html.slice(debut - OUVRE.length, debut) === OUVRE
          && html.slice(fin, fin + FERME.length) === FERME;
        blocs.push({
          id,
          debut: avecEnveloppe ? debut - OUVRE.length : debut,
          fin: avecEnveloppe ? fin + FERME.length : fin,
          avecEnveloppe,
        });
      }
    }
  }
  if (pile !== 0) meurs("les balises <section> ne s'apparient pas : la capture est abimee.");
  return blocs;
}

/** Retire le popup de la vente bêta, apparié par une pile de <div>. */
function retirerPopup(html) {
  const ancre = `<div data-testid="${POPUP_BETA}"`;
  const debut = html.indexOf(ancre);
  if (debut < 0) meurs(`le popup de la vente beta est introuvable (${POPUP_BETA}). Rien n'a ete ecrit.`);
  const re = /<div\b[^>]*>|<\/div>/gi;
  re.lastIndex = debut;
  let m, pile = 0, fin = -1;
  while ((m = re.exec(html))) {
    if (m[0][1] !== "/") pile++;
    else { pile--; if (pile === 0) { fin = re.lastIndex; break; } }
  }
  if (fin < 0) meurs("le popup de la vente beta n'est pas apparie : rien n'a ete ecrit.");
  return { html: html.slice(0, debut) + html.slice(fin), octets: fin - debut };
}

// ---------------------------------------------------------------- 1. lire
if (!fs.existsSync(SOURCE)) meurs(`${path.relative(RACINE, SOURCE)} est absent.`);
let html = fs.readFileSync(SOURCE, "utf8");
const octetsDepart = html.length;

const blocs = decouper(html);
const sansEnveloppe = blocs.filter((b) => !b.avecEnveloppe);
if (sansEnveloppe.length) {
  meurs(
    "ces sections ne portent pas l'enveloppe attendue, elles ne sont pas deplacables :\n   " +
      sansEnveloppe.map((b) => b.id ?? "(sans id)").join(", "),
  );
}

console.log(`Capture   : ${path.relative(RACINE, SOURCE)}  (${(octetsDepart / 1024).toFixed(0)} Ko, ${blocs.length} sections)`);

// ------------------------------------------------------------- 2. le plan
const verdict = verifierPlan(blocs.map((b) => b.id));
if (!verdict.ok) {
  const lignes = [];
  if (verdict.manquantes.length) lignes.push("  absentes du plan (elles disparaitraient) : " + verdict.manquantes.join(", "));
  if (verdict.enTrop.length) lignes.push("  reclamees par le plan et absentes de la capture : " + verdict.enTrop.join(", "));
  meurs("le plan et la capture ne sont pas d'accord :\n" + lignes.join("\n"));
}

// ------------------------------------------------------- 3. les corrections
for (const c of CORRECTIONS_V2) {
  const n = html.split(c.cherche).length - 1;
  if (n === 0) meurs(`la correction « ${c.cherche} » ne trouve aucune cible.\n   ${c.pourquoi}`);
  html = html.split(c.cherche).join(c.remplace);
  console.log(`Correction: « ${c.cherche} » -> « ${c.remplace} »  (${n}x)`);
}

// ------------------------------------------------------------ 4. le popup
const retrait = retirerPopup(html);
html = retrait.html;
console.log(`Retire    : le popup de la vente beta  (${(retrait.octets / 1024).toFixed(1)} Ko)`);

// ------------------------------------------ 5. le bundle qui reconstruit
// À FAIRE AVANT LE RÉASSEMBLAGE, pas après : c'est ce retrait qui rend
// le réassemblage visible. Voir `SCRIPTS_RETIRES` pour la mesure.
for (const nom of SCRIPTS_RETIRES.bundles) {
  const re = new RegExp(`<script[^>]*src="/v/tiquiz/${nom}\\.js"[^>]*>\\s*</script>`, "gi");
  const n = (html.match(re) ?? []).length;
  if (n === 0) meurs(`le bundle /v/tiquiz/${nom}.js est introuvable : rien n'a ete ecrit.`);
  html = html.replace(re, "");
}
for (const nom of SCRIPTS_RETIRES.etats) {
  const re = new RegExp(`<script[^>]*>\\s*window\\.${nom}=[\\s\\S]*?</script>`, "gi");
  const n = (html.match(re) ?? []).length;
  if (n === 0) meurs(`l'etat window.${nom} est introuvable : rien n'a ete ecrit.`);
  html = html.replace(re, "");
}
console.log(
  `Retire    : le bundle React de l'editeur Systeme.io ` +
    `(${SCRIPTS_RETIRES.bundles.length} scripts + ${SCRIPTS_RETIRES.etats.length} etats)`,
);

// Les offsets ont bougé : on redécoupe sur le HTML corrigé.
const blocs2 = decouper(html);
const parId = new Map(blocs2.map((b) => [b.id, html.slice(b.debut, b.fin)]));

// --------------------------------------------------------- 6. reassembler
const premier = blocs2[0].debut;
const dernier = blocs2.at(-1).fin;
const tete = html.slice(0, premier);
const queue = html.slice(dernier);

const morceaux = [];
for (const bloc of ORDRE_V2) {
  if (bloc.genre === "origine") {
    morceaux.push(parId.get(bloc.id));
    continue;
  }
  const chemin = path.join(DOSSIER_BLOCS, bloc.fichier);
  if (!fs.existsSync(chemin)) meurs(`le bloc neuf ${path.relative(RACINE, chemin)} est absent.`);
  // Le bloc neuf prend la MÊME enveloppe que les autres : sans elle, il
  // sortirait de la colonne de la page et se collerait au bord.
  morceaux.push(OUVRE + fs.readFileSync(chemin, "utf8").trim() + FERME);
}

const sortie = tete + morceaux.join("") + queue;

// ------------------------------------------------------------- 7. le compte
console.log("\nOrdre de la version de travail :");
ORDRE_V2.forEach((b, i) => {
  const nom = b.genre === "origine" ? b.id : "NEUF  " + b.fichier;
  console.log(`  ${String(i + 1).padStart(2)}. ${nom.padEnd(34)} ${b.role}`);
});

const deplaces = ORDRE_V2.filter((b) => b.genre === "origine").map((b) => b.id);
const avant = blocs.map((b) => b.id);
const bouges = deplaces.filter((id, i) => avant[i] !== id).length;
console.log(
  `\nBilan     : ${deplaces.length} sections conservees, ${bouges} a une nouvelle place, ` +
    `${ORDRE_V2.filter((b) => b.genre === "neuf").length} blocs neufs, 1 popup retire.`,
);

if (VERIFIE) {
  console.log("\n--verifie : rien n'a ete ecrit.");
  process.exit(0);
}

fs.writeFileSync(CIBLE, sortie, "utf8");
console.log(`\n✓ ${path.relative(RACINE, CIBLE)} ecrit  (${(sortie.length / 1024).toFixed(0)} Ko)`);
