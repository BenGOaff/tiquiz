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
const { ORDRE_V2, POPUP_BETA, CORRECTIONS_V2, SCRIPTS_RETIRES, FONDS_CONVERTIS, verifierPlan } = plan;

const faqMod = await import(pathToFileURL(path.join(RACINE, "lib/sales/faqV2.ts")).href);
const { rangerFaq, CORRECTIONS_FAQ } = faqMod;
const altMod = await import(pathToFileURL(path.join(RACINE, "lib/sales/altImagesV2.ts")).href);
const { altDe, nonClassees } = altMod;
const dimMod = await import(pathToFileURL(path.join(RACINE, "lib/blog/dimensionsImage.ts")).href);
const { dimensionsImage, dimensionsSvg } = dimMod;
const icoMod = await import(pathToFileURL(path.join(RACINE, "lib/sales/iconesV2.ts")).href);
const { ICONES_V2, cssIcones, FAMILLES_RETIREES } = icoMod;
const avMod = await import(pathToFileURL(path.join(RACINE, "lib/checkout/avantages.ts")).href);
const { AVANTAGES_NOUVEAUX, AVANTAGES_PLUS } = avMod;

/** Échappe ce qui part dans du HTML. Le texte vient d'un JSON, pas de nous. */
const ech = (t) => String(t).replace(/&(?![a-z#0-9]+;)/gi, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * LA FAQ, REFAITE À PARTIR DU JSON-LD.
 *
 * Le `FAQPage` de la page porte déjà les 16 questions. On les relit et
 * on FABRIQUE la section avec : une seule source, donc pas de dérive
 * entre ce que Google lit et ce que la lectrice voit.
 *
 * `<details>` natif, zéro script : ça ne peut plus se casser en retirant
 * un bundle, et ça s'ouvre au clavier comme à la souris.
 */
function construireFaq(html) {
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i.exec(html);
  if (!m) meurs("le JSON-LD de la FAQ est introuvable : rien n'a ete ecrit.");
  let brut = m[1];
  for (const c of CORRECTIONS_FAQ) {
    if (!brut.includes(c.cherche)) meurs(`la correction FAQ « ${c.cherche} » ne trouve rien.\n   ${c.pourquoi}`);
    brut = brut.split(c.cherche).join(c.remplace);
  }
  let donnees;
  try { donnees = JSON.parse(brut); } catch (e) { meurs("le JSON-LD de la FAQ est illisible : " + e.message); }
  const questions = donnees.mainEntity ?? [];
  const range = rangerFaq(questions);
  if (range.inconnues.length) meurs("le plan de la FAQ nomme des questions absentes :\n   " + range.inconnues.join("\n   "));
  if (range.orphelines.length) {
    meurs(
      "ces questions n'entrent dans aucun groupe, elles DISPARAITRAIENT de la page\n" +
        "   alors qu'elles resteraient dans les donnees structurees :\n   " +
        range.orphelines.map((q) => q.name).join("\n   "),
    );
  }
  const groupes = range.groupes
    .filter((g) => g.questions.length)
    .map(
      (g) => `<div class="tqv-faq-g"><h3>${ech(g.titre)}</h3>` +
        g.questions
          .map(
            (q) =>
              `<details class="tqv-faq-q"><summary>${ech(q.name)}</summary>` +
              `<div class="tqv-faq-r">${q.acceptedAnswer.text}</div></details>`,
          )
          .join("") +
        `</div>`,
    )
    .join("");
  // LE JSON-LD REPART AVEC LA SECTION, et c'est une régression que ma
  // propre sonde a attrapée : il vivait DANS `section-25c05a06`, donc
  // remplacer la section l'emportait. Google perdait les 16 questions,
  // en silence, sur la page qu'on veut faire remonter.
  //
  // Il est RECONSTRUIT depuis les questions corrigées, pas recopié : une
  // structure qui dirait « obligé(e) » quand la page dit « faut-il »
  // serait une deuxième version du texte, donc une divergence de plus.
  const jsonld =
    `<script type="application/ld+json">` +
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: questions.map((q) => ({
        "@type": "Question",
        name: q.name,
        acceptedAnswer: { "@type": "Answer", text: q.acceptedAnswer.text },
      })),
    }).replace(/</g, "\\u003c") +
    `</script>`;

  const section =
    `<section id="section-25c05a06" class="tqv-faq-sec">` +
    jsonld +
    `<style>` +
    `.tqv-faq-sec{width:100%;background:#fff;padding:100px 20px}` +
    `.tqv-faq{width:100%;max-width:860px;margin:0 auto;font-family:"Open Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#2B3264;box-sizing:border-box}` +
    `.tqv-faq *{box-sizing:border-box}` +
    `.tqv-faq-h{font-size:38px;line-height:1.2;font-weight:700;margin:0 0 14px;text-align:center}` +
    `.tqv-faq-p{font-size:17px;line-height:1.6;color:#3B3B3B;margin:0 0 44px;text-align:center}` +
    `.tqv-faq-g{margin:0 0 34px}` +
    `.tqv-faq-g:last-child{margin:0}` +
    `.tqv-faq-g h3{font-size:14px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#5A6EF6;margin:0 0 12px}` +
    `.tqv-faq-q{border-top:1px solid #E4E8F2}` +
    `.tqv-faq-g .tqv-faq-q:last-child{border-bottom:1px solid #E4E8F2}` +
    `.tqv-faq-q>summary{list-style:none;cursor:pointer;padding:18px 34px 18px 0;font-size:17px;font-weight:600;line-height:1.45;position:relative}` +
    `.tqv-faq-q>summary::-webkit-details-marker{display:none}` +
    `.tqv-faq-q>summary::after{content:"+";position:absolute;right:4px;top:16px;font-size:24px;font-weight:400;color:#5A6EF6;line-height:1}` +
    `.tqv-faq-q[open]>summary::after{content:"\u2212"}` +
    `.tqv-faq-q>summary:focus-visible{outline:2px solid #5A6EF6;outline-offset:2px;border-radius:6px}` +
    `.tqv-faq-r{font-size:16px;line-height:1.7;color:#3B3B3B;padding:0 34px 22px 0}` +
    `.tqv-faq-r a{color:#5A6EF6;text-decoration:underline}` +
    `@media (max-width:900px){.tqv-faq-sec{padding:60px 16px}.tqv-faq-h{font-size:28px}.tqv-faq-q>summary{font-size:16px}}` +
    `</style>` +
    `<div class="tqv-faq"><h2 class="tqv-faq-h">Questions fréquentes</h2>` +
    `<p class="tqv-faq-p">Clique sur une question pour lire la réponse.</p>` +
    groupes +
    `</div></section>`;
  return { section, nb: questions.length, groupes: range.groupes.filter((g) => g.questions.length).length };
}

/**
 * LES AVANTAGES MANQUANTS, INJECTÉS DANS LA GRILLE TARIFAIRE.
 *
 * La grille est capturée : on ne la réécrit pas, on ajoute les lignes
 * qui manquent au format exact de celles qui existent. Le texte vient de
 * `lib/checkout/avantages.ts`, LA MÊME source que le bon de commande.
 */
function ligneTarif(texte) {
  return (
    `<li dir="ltr" style="display: flex; align-items: stretch; ">` +
    `<i class='fas fa-check-circle' style="line-height: inherit"></i>` +
    `<div><p dir="ltr"><span style="color: rgb(61, 66, 102)">${ech(texte)}</span></p></div></li>`
  );
}

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

// -------------------------------------------- 5bis. les avantages
// APRÈS « Statistiques de complétion », qui figure dans les 6 colonnes
// (compté : 6 dans le DOM). Les nouveautés valent pour tous les paliers,
// aucun `canUse…` ne les garde.
{
  const ancre = '<span style="color: rgb(61, 66, 102)">Statistiques de complétion</span></p></div></li>';
  const n = html.split(ancre).length - 1;
  if (n !== 6) meurs(`l'ancre des avantages apparait ${n} fois au lieu de 6 : la grille a bouge.`);
  html = html.split(ancre).join(ancre + AVANTAGES_NOUVEAUX.map((a) => ligneTarif(a.texte)).join(""));
  console.log(`Ajoute    : ${AVANTAGES_NOUVEAUX.length} avantages dans les ${n} colonnes de tarif`);

  // Et les générateurs, dans les DEUX colonnes PLUS seulement.
  const gen = AVANTAGES_PLUS.find((a) => a.texte.includes("générateurs"));
  if (!gen) meurs("l'avantage des generateurs a disparu de lib/checkout/avantages.ts.");
  const ancrePlus = '<span style="color: rgb(61, 66, 102)"><strong>Multi-clés API Systeme io :</strong></span><br><span style="color: rgb(61, 66, 102)">Connecte autant de comptes que nécessaire</span></p></div></li>';
  const p = html.split(ancrePlus).length - 1;
  if (p !== 2) meurs(`l'ancre PLUS apparait ${p} fois au lieu de 2.`);
  html = html.split(ancrePlus).join(ancrePlus + ligneTarif(gen.texte));
  console.log(`Ajoute    : les generateurs dans les ${p} colonnes PLUS`);
}

// -------------------------------------------- 5hexa. les icones
// 593 Ko de Font Awesome Pro pour TROIS dessins (compte : check-circle
// 106 fois, arrow-right 21, video 1). On garde les `<i>` et leurs
// classes, donc toute la mise en page de la page continue de
// s'appliquer ; on dessine dedans par `mask-image`, et on retire les
// `@font-face` de Font Awesome.
{
  const connues = new Set(ICONES_V2.map((i) => i.classe));

  // 1. Marquer les icônes connues. On AJOUTE une classe, on n'en retire
  //    aucune : le CSS de la page cible `.fas`, `.far` et `.fa-*`.
  //
  //    LES DEUX SORTES DE GUILLEMETS, et ce n'est pas de la prudence :
  //    mon premier jet ne lisait que `class="…"` et n'a marqué que 38
  //    icônes sur 128. La page en écrit une partie en `class='…'`
  //    (`<i class='fas fa-check-circle' style="line-height: inherit">`),
  //    c'est à dire exactement les cocher de la grille tarifaire. Le
  //    compte affiché est ce qui l'a dit : 38 pour 128 attendues.
  const CLASSE = /\bclass=("([^"]*)"|'([^']*)')/i;
  let marquees = 0;
  html = html.replace(/<i\b[^>]*>/gi, (balise) => {
    const m = CLASSE.exec(balise);
    if (!m) return balise;
    const classes = m[2] ?? m[3] ?? "";
    if (!classes.split(/\s+/).some((c) => connues.has(c))) return balise;
    marquees++;
    const q = m[2] != null ? '"' : "'";
    return balise.replace(m[0], `class=${q}${classes} tqv-ico${q}`);
  });

  // 2. AUCUNE ICÔNE INCONNUE NE DOIT RESTER. Sans ce contrôle, retirer
  //    les polices laisserait un carré vide sur la grille tarifaire, et
  //    personne ne le verrait avant une cliente.
  //
  //    LE CONTRÔLE NE REJOUE PAS LA MÊME EXPRESSION QUE LE MARQUAGE : il
  //    balaie TOUT le document à la recherche d'une classe `fa-`, quelle
  //    que soit la balise et quels que soient les guillemets. Un contrôle
  //    qui partage l'angle mort de ce qu'il vérifie ne vérifie rien.
  //    Il regarde les ATTRIBUTS `class`, sur n'importe quelle balise et
  //    avec les deux sortes de guillemets. Balayer le document entier
  //    serait pire : la feuille de Font Awesome DÉCLARE ses 2000 icônes
  //    (`.fa-chevron-down{--fa:"\f078"}`) sans qu'aucune ne soit posée
  //    sur un élément, et le contrôle crierait sur onze icônes que la
  //    page n'affiche pas. Un contrôle qui crie pour rien finit
  //    désactivé, et on se retrouve sans contrôle du tout.
  const restantes = new Set();
  for (const m of html.matchAll(/\bclass=("([^"]*)"|'([^']*)')/gi)) {
    for (const c of (m[2] ?? m[3] ?? "").split(/\s+/)) {
      const n = c.toLowerCase();
      if (n.startsWith("fa-") && !connues.has(n)) restantes.add(n);
    }
  }
  if (restantes.size) {
    meurs(
      "ces icones ne sont pas dessinees, retirer les polices les rendrait invisibles :\n   " +
        [...restantes].join(", ") +
        "\n   Ajoute-les a ICONES_V2 (lib/sales/iconesV2.ts).",
    );
  }

  // 3. Poser le CSS des icônes, juste avant la fin du <head>.
  const style = `<style id="tqv-icones">${cssIcones()}</style>`;
  if (!html.includes("</head>")) meurs("pas de </head> : impossible de poser le CSS des icones.");
  html = html.replace("</head>", style + "</head>");

  // 4. Retirer les `@font-face` de Font Awesome, et EUX SEULS.
  let retirees = 0, poids = 0;
  const vues = new Set();
  html = html.replace(/@font-face\s*\{[^}]*\}/gi, (regle) => {
    const famille = /font-family\s*:\s*["']?([^;"'}]+)/i.exec(regle)?.[1]?.trim();
    if (!famille || !FAMILLES_RETIREES.includes(famille)) return regle;
    retirees++;
    for (const u of regle.matchAll(/\/v\/tiquiz\/([0-9a-f]+)\.woff2?/gi)) {
      if (vues.has(u[1])) continue;
      vues.add(u[1]);
      const f = path.join(RACINE, "public/v/tiquiz", `${u[1]}.woff2`);
      if (fs.existsSync(f)) poids += fs.statSync(f).size;
    }
    return "";
  });
  if (retirees === 0) meurs("aucune police Font Awesome trouvee : la capture a bouge.");
  const attendues = ICONES_V2.reduce((t, i) => t + i.vues, 0);
  if (marquees < attendues) {
    meurs(
      `${marquees} icones marquees, ${attendues} attendues d'apres ICONES_V2.\n` +
        "   Il en reste qui compteront sur une police qu'on vient de retirer.",
    );
  }
  console.log(
    `Icones    : ${marquees} icones dessinees en SVG, ${retirees} @font-face retirees ` +
      `(${(poids / 1024).toFixed(0)} Ko de police en moins)`,
  );
}

// ---------------------------------------------- 5penta. les fonds
// Les cinq « SVG » de fond sont des bitmaps encapsulés : 1639 Ko à eux
// cinq, contre 316 Ko pour tout le CSS de la page. `npm run vente:fonds`
// en produit la version WebP ; ici on ne fait que remplacer l'adresse.
{
  let poidsAvant = 0, poidsApres = 0;
  for (const nom of FONDS_CONVERTIS) {
    const webp = path.join(RACINE, "public/v/tiquiz", `${nom}.webp`);
    if (!fs.existsSync(webp)) {
      meurs(`le fond ${nom}.webp est absent. Lance d'abord : npm run vente:fonds`);
    }
    const n = html.split(`/v/tiquiz/${nom}.svg`).length - 1;
    if (n === 0) meurs(`le fond ${nom}.svg n'est reference nulle part : la capture a bouge.`);
    html = html.split(`/v/tiquiz/${nom}.svg`).join(`/v/tiquiz/${nom}.webp`);
    poidsAvant += fs.statSync(path.join(RACINE, "public/v/tiquiz", `${nom}.svg`)).size;
    poidsApres += fs.statSync(webp).size;
  }
  console.log(
    `Fonds     : ${FONDS_CONVERTIS.length} fonds de section en WebP  ` +
      `(${(poidsAvant / 1024).toFixed(0)} Ko -> ${(poidsApres / 1024).toFixed(0)} Ko)`,
  );
}

// ------------------------------------------ 5octo. les textes alternatifs
// 89 balises <img> sur 105 n'ont AUCUN alt. Sans alt, un lecteur d'écran
// lit le NOM DU FICHIER : « slash v slash tiquiz slash 4 c 2 8 9 d ».
// Avec `alt=""`, il la saute, ce qui est le bon comportement pour une
// décoration. Les deux ne se confondent pas.
{
  // ON NE REGARDE QUE CE QUI N'EN A PAS. La capture porte déjà de bons
  // textes sur trois images (le logo, deux prénoms de la démonstration),
  // et on n'écrase JAMAIS un alt existant : c'est la règle du blog du
  // 1er septembre, où l'écraser en masse aurait fait perdre les bons.
  // Mon premier jet les signalait comme non classées, alors qu'elles
  // étaient les mieux décrites de la page.
  const sansAlt = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (/\balt=/i.test(m[0])) continue;
    const src = /\bsrc="([^"]*)"/i.exec(m[0])?.[1];
    if (src) sansAlt.push(src);
  }
  const orphelines = nonClassees(sansAlt);
  if (orphelines.length) {
    meurs(
      "ces images n'ont pas de texte alternatif decide :\n   " +
        orphelines.join("\n   ") +
        "\n   REGARDE-LES, puis ajoute-les a lib/sales/altImagesV2.ts.\n" +
        "   Un alt invente a partir du nom de fichier ne veut rien dire.",
    );
  }
  // Le seul alt hérité qui dit FAUX : le logo, décrit « Logo Tipote »
  // sur la page qui vend Tiquiz. La table gagne sur ce qu'elle nomme.
  {
    const faux = 'alt="Logo Tipote"';
    const n = html.split(faux).length - 1;
    if (n !== 1) meurs(`« ${faux} » apparait ${n} fois au lieu de 1 : la capture a bouge.`);
    html = html.split(faux).join('alt="Tiquiz"');
    console.log("Logo      : « Logo Tipote » corrige en « Tiquiz » (le logo affiche tiquiz)");
  }

  let posees = 0, vides = 0;
  html = html.replace(/<img\b([^>]*)>/gi, (balise, attrs) => {
    if (/\balt=/i.test(attrs)) return balise;
    const src = /\bsrc="([^"]*)"/i.exec(attrs)?.[1];
    if (!src) return balise;
    const alt = altDe(src);
    if (alt === undefined) return balise; // pas une image locale
    posees++;
    if (alt === "") vides++;
    return `<img${attrs} alt="${alt.replace(/"/g, "&quot;")}">`;
  });
  console.log(
    `Textes alt: ${posees} images decrites  (${posees - vides} portent un texte, ` +
      `${vides} sont declarees decoratives)`,
  );
}

// ------------------------------------------ 5quater. les images
// LES DIMENSIONS, LUES SUR LE DISQUE.
//
// MESURÉ : les 104 images de la page n'en portent AUCUNE. Le navigateur
// ne peut donc pas réserver leur place, et la page saute pendant
// qu'elles arrivent : c'est le décalage de mise en page, celui qui fait
// cliquer à côté du bouton qu'on visait.
//
// On ne DEVINE pas : on lit les premiers octets du fichier
// (`lib/blog/dimensionsImage.ts`, le module déjà écrit pour le blog, qui
// lit WebP, PNG, JPEG, GIF et le viewBox des SVG). Aucune dépendance de
// plus, et une image dont on ne sait pas lire la taille reste telle
// quelle plutôt que de recevoir un chiffre inventé.
//
// LE `width` DÉJÀ PRÉSENT NE SE TOUCHE PAS : 37 images en portent un, et
// c'est la largeur d'AFFICHAGE choisie par la page. On complète avec le
// `height` PROPORTIONNEL, pour que le ratio réservé soit le bon.
{
  const cache = new Map();
  const lire = (src) => {
    if (cache.has(src)) return cache.get(src);
    let d = null;
    if (src.startsWith("/") && !src.startsWith("//")) {
      const f = path.join(RACINE, "public", src.split("?")[0]);
      if (fs.existsSync(f)) {
        const buf = fs.readFileSync(f);
        d = f.toLowerCase().endsWith(".svg") ? dimensionsSvg(buf.toString("utf8")) : dimensionsImage(buf);
      }
    }
    cache.set(src, d);
    return d;
  };

  let posees = 0, inconnues = 0, vues = 0;
  html = html.replace(/<img\b([^>]*)>/gi, (balise, attrs) => {
    vues++;
    if (/\bheight=/i.test(attrs)) return balise;
    const src = /\bsrc="([^"]*)"/i.exec(attrs)?.[1];
    if (!src) return balise;
    const d = lire(src);
    if (!d || !d.largeur || !d.hauteur) { inconnues++; return balise; }
    const largeurAffichee = Number(/\bwidth="(\d+)"/i.exec(attrs)?.[1]);
    posees++;
    if (Number.isFinite(largeurAffichee) && largeurAffichee > 0) {
      // Une largeur d'affichage existe : on rend la HAUTEUR qui garde le
      // ratio du fichier, pas la hauteur du fichier.
      const h = Math.round((largeurAffichee * d.hauteur) / d.largeur);
      return `<img${attrs} height="${h}">`;
    }
    return `<img${attrs} width="${d.largeur}" height="${d.hauteur}">`;
  });
  console.log(
    `Dimensions: ${posees} images sur ${vues} savent enfin leur place` +
      (inconnues ? `  (${inconnues} illisibles, laissees telles quelles)` : ""),
  );
}


// MESURÉ sur la capture : 69 images sur 104 se chargent sans `lazy`, et
// AUCUNE ne porte de dimensions. Les deux coûtent au même endroit, le
// score de chargement :
//
//   - sans `lazy`, le navigateur télécharge les 104 images avant même que
//     le visiteur n'ait fait défiler ;
//   - sans `width`/`height`, il ne peut pas réserver la place, donc la
//     page saute pendant qu'elles arrivent (le fameux décalage de mise
//     en page qui fait cliquer à côté).
//
// ON NE TOUCHE PAS AUX PREMIÈRES : une image du premier écran mise en
// `lazy` arrive PLUS TARD, ce qui dégrade exactement la mesure qu'on
// cherche à améliorer. Les huit premières sont donc laissées telles
// quelles, c'est à dire le logo et le visuel d'accroche.
{
  let vues = 0, posees = 0;
  html = html.replace(/<img\b([^>]*)>/gi, (balise, attrs) => {
    vues++;
    if (vues <= 8) return balise;
    if (/\bloading=/i.test(attrs)) return balise;
    posees++;
    return `<img${attrs} loading="lazy" decoding="async">`;
  });
  console.log(`Images    : ${posees} passees en chargement differe sur ${vues} (les 8 premieres restent immediates)`);
}

// ------------------------------------------------------- 5ter. la FAQ
{
  const faq = construireFaq(html);
  const blocsFaq = decouper(html);
  const cible = blocsFaq.find((b) => b.id === "section-25c05a06");
  if (!cible) meurs("la section FAQ est introuvable.");
  // On remplace la SECTION seule : l'enveloppe est reposée au
  // réassemblage, comme pour n'importe quel autre bloc.
  const avant = html.slice(cible.debut, cible.fin);
  html = html.slice(0, cible.debut) + OUVRE + faq.section + FERME + html.slice(cible.fin);
  console.log(
    `Refaite   : la FAQ, ${faq.nb} questions en ${faq.groupes} groupes, <details> natif ` +
      `(${(avant.length / 1024).toFixed(0)} Ko -> ${((faq.section.length + OUVRE.length + FERME.length) / 1024).toFixed(0)} Ko)`,
  );
}

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
