// tests/logic/import-blog-fr.test.mts
//
// LE CONTENU PERDU À L'IMPORT (Béné, 8 septembre 2026).
//
// "ben il faut corriger, c'est toi qui a importé mes articles ! Ou un
// autre agent mais en tous cas on peut pas laisser de la merde !!"
//
// Quatre articles français avaient perdu du contenu à l'import du
// 29 août. Deux causes, les deux mesurées sur ses pages sources :
// `BulletList` n'avait aucun cas, et `RawHtml` était sauté sans
// regarder ce qu'il porte.
//
// Ce test vise le COMPORTEMENT de `lib/blog/importBlocs.ts`, jamais la
// forme du script : celui-ci va chercher les pages sur le réseau, donc
// aucun test ne peut le lancer, et c'est exactement pour ça que les
// décisions ont quitté le script.

import assert from "node:assert/strict";
import test from "node:test";

import {
  blocsDe,
  fusionner,
  proximite,
  restesVides,
  sansCodeNiStyle,
  PROCHE,
} from "@/lib/blog/importBlocs";
import { retirerBlocsEnDouble, retirerTitreOrphelin } from "@/lib/blog/miseEnPage";
import { reponctuer, retirerTiretsLongs } from "@/lib/blog/reponctuation";
import type { Bloc } from "@/lib/blog/articles";

/** Une page minuscule, dans la forme que Systeme.io rend vraiment. */
function page(enfants: Record<string, unknown>[]) {
  const ents: Record<string, any> = {
    racine: { type: "BlogPostBody", childIds: enfants.map((_, i) => `e${i}`) },
  };
  enfants.forEach((e, i) => {
    ents[`e${i}`] = e;
  });
  return { ents, racine: ents.racine };
}

const extraire = (enfants: Record<string, unknown>[], restes = restesVides()) => {
  const { ents, racine } = page(enfants);
  return blocsDe(ents, racine, {}, restes, "un-article");
};

// ── LA CAUSE 1 : LES LISTES À PUCES ──

test("une liste a puces est du contenu, pas un conteneur", () => {
  // C'EST LE BUG. `BulletList` porte son `<ul>` dans `.content` et n'a
  // AUCUN enfant : sans cas dedie il tombait dans le `default:` qui
  // marche les `childIds`, donc il ne produisait rien. Six listes
  // perdues dans `strategie-quiz-marketing-tiquiz`, une dans le
  // comparatif, sans qu'une ligne ne le dise.
  const blocs = extraire([
    { type: "BulletList", content: "<ul><li><p>Une question = une info.</p></li></ul>" },
  ]);
  assert.equal(blocs.length, 1, "la liste a puces est rendue");
  assert.equal(blocs[0].type, "html");
  assert.match((blocs[0] as { html: string }).html, /Une question = une info/);
});

// ── LA CAUSE 2 : LES BLOCS BRUTS ──

test("un bloc brut qui porte du texte est rendu, le decor est ecarte", () => {
  // La raison ecrite dans l'ancien import disait "les RawHtml de ces
  // pages ne portent QUE du JSON-LD". C'etait vrai des quatre pages
  // ANGLAISES et faux des francaises, ou ce sont le comparatif des
  // 8 outils, le cout reel et le traitement des donnees. Une regle
  // ecrite pour un cas, appliquee telle quelle a un autre (1er aout).
  const restes = restesVides();
  const blocs = extraire(
    [
      { type: "RawHtml", content: "<style>.a{color:red}</style><table><tr><td>Tiquiz</td></tr></table>" },
      { type: "RawHtml", content: "<style>#row-1{border:0}</style>" },
      { type: "RawHtml", content: '<script type="application/ld+json">{"@type":"FAQPage"}</script>' },
    ],
    restes,
  );
  assert.equal(blocs.length, 1, "seul le bloc qui porte du texte est rendu");
  assert.match((blocs[0] as { html: string }).html, /Tiquiz/);
  assert.ok(!(blocs[0] as { html: string }).html.includes("color:red"), "le CSS ne part pas dans l'article");
});

test("le CSS, le code, un SVG et une image ne finissent jamais dans un article", () => {
  // `nettoyerBloc` retire les BALISES inconnues et garde ce qu'il y a
  // ENTRE : un `<style>` garde tel quel deverserait ses regles EN TEXTE
  // au milieu de l'article, et un SVG toutes ses etiquettes en vrac.
  const brut =
    "<style>.x{--ink:#000}</style><script>alert(1)</script>" +
    '<svg viewBox="0 0 10 10"><text>Typeform Plus 50 EUR/mois</text></svg>' +
    '<img src="https://d1yei2z3i6k35z.cloudfront.net/logo.png">' +
    "<p>Le vrai texte.</p>";
  const propre = sansCodeNiStyle(brut);
  assert.ok(propre.includes("Le vrai texte."), "le contenu reste");
  for (const interdit of ["--ink", "alert(1)", "Typeform Plus 50", "cloudfront"]) {
    assert.ok(!propre.includes(interdit), `${interdit} ne doit pas survivre`);
  }
});

test("un SVG et une video sont SIGNALES, jamais avales", () => {
  // Notre gabarit n'a ni bloc video ni rendu SVG. Les poser en `html`
  // donnerait un bloc VIDE a l'ecran, c'est a dire le silence qu'on
  // repare ici. Ils sortent donc nommes dans le rapport.
  const restes = restesVides();
  extraire(
    [
      { type: "Video", url: "https://youtu.be/abc" },
      { type: "RawHtml", content: "<svg><text>schema</text></svg>" },
    ],
    restes,
  );
  assert.equal(restes.videos.length, 1, "la video est nommee");
  assert.match(restes.videos[0], /youtu\.be\/abc/);
  assert.equal(restes.schemas.length, 1, "le schema est nomme");
});

test("un type inconnu est compte, jamais avale en silence", () => {
  // C'est exactement le silence qui a coute ce chantier : un type sans
  // cas disparaissait sans qu'une ligne ne le dise.
  const restes = restesVides();
  extraire([{ type: "UnTypeQuiNExistePasEncore", content: "<p>x</p>" }], restes);
  assert.equal(restes.perdus.get("UnTypeQuiNExistePasEncore"), 1);
});

test("un conteneur marche ses enfants, il ne se compte pas comme perdu", () => {
  const restes = restesVides();
  const ents: Record<string, any> = {
    racine: { type: "BlogPostBody", childIds: ["r"] },
    r: { type: "Row", childIds: ["c"] },
    c: { type: "Column", childIds: ["t"] },
    t: { type: "Text", content: "<p>au fond</p>" },
  };
  const blocs = blocsDe(ents, ents.racine, {}, restes, "un-article");
  assert.equal(blocs.length, 1);
  assert.equal(restes.perdus.size, 0, "Row et Column ne sont pas des types perdus");
});

// ── LA FUSION ──

const html = (t: string): Bloc => ({ type: "html", html: `<p>${t}</p>` });
const titre = (t: string): Bloc => ({ type: "titre", niveau: 2, texte: t, id: "x" });

test("la fusion ne peut QU'AJOUTER : rien du disque ne disparait", () => {
  // C'est la decision qui tient tout le chantier. Un re-import franc
  // coutait trois choses invisibles : les images (chemins de CDN, dont
  // 22 RENOMMEES au rapatriement), les 62 textes alternatifs (poses a
  // partir du chemin LOCAL) et toutes les corrections de faits.
  const anciens: Bloc[] = [html("un"), html("deux"), html("trois")];
  const nouveaux: Bloc[] = [html("un"), html("intercale"), html("deux"), html("trois")];
  const { blocs } = fusionner(anciens, nouveaux);
  assert.equal(blocs.length, 4);
  for (const a of anciens) assert.ok(blocs.includes(a), "le bloc du disque est le MEME objet");
  assert.equal((blocs[1] as { html: string }).html, "<p>intercale</p>", "la nouveaute est a sa place");
});

test("un bloc corrige depuis n'est pas reinsere en double", () => {
  // Le disque porte le lien corrige, la source l'ancien. Les inserer
  // tous les deux donnerait le paragraphe en double, avec le lien mort
  // que la correction avait justement retire.
  const surDisque = html(
    "Va voir la demo sur tiquiz.fr. A chaque reponse, le contact se tague automatiquement dans ton Systeme io.",
  );
  const aLaSource = html(
    "Va voir la demo sur tipote.fr/tiquiz. A chaque reponse, le contact se tague automatiquement dans ton Systeme io.",
  );
  assert.ok(
    proximite(surDisque, aLaSource) >= PROCHE,
    "deux versions du meme paragraphe se reconnaissent",
  );
  const { blocs, retrouves } = fusionner([titre("A"), surDisque], [titre("A"), aLaSource]);
  assert.equal(blocs.length, 2, "rien n'est ajoute");
  assert.equal(retrouves.length, 1);
  assert.ok(blocs.includes(surDisque), "c'est la version corrigee qui reste");
});

test("le seuil de proximite ne tranche rien a la limite", () => {
  // Mesure du 8 septembre sur les 22 blocs non apparies : les vraies
  // nouveautes sortent entre 0,00 et 0,12, les blocs simplement
  // corriges entre 0,89 et 0,97. Le seuil constate un ecart, il
  // n'arbitre pas un cas limite.
  const a = html("Conversion a 30-40 % au lieu de tes 2-3 %. Leads deja segmentes.");
  const b = html("Va voir la demo sur tiquiz.fr, le contact se tague dans ton Systeme io.");
  assert.ok(proximite(a, b) < 0.2, "deux blocs sans rapport restent loin du seuil");
});

test("un doublon deja sur le disque n'est jamais reinsere", () => {
  // SANS CETTE AMORCE, L'IMPORT ET LA REPARATION SE BATTENT :
  // `blog:reparer` retire le doublon, l'import suivant le remet, et
  // rien n'atteint jamais un etat stable. Sa page source porte
  // vraiment deux fois la meme liste a puces (mesure).
  const p = html("Une fois que tu as ce vocabulaire, tu le reinjectes partout dans ton quiz : titre, questions, options.");
  const { blocs, doublons } = fusionner([titre("A"), p], [titre("A"), p, p]);
  assert.equal(blocs.length, 2, "la copie n'entre pas");
  assert.equal(doublons.length, 1, "et elle est DITE");
});

test("un ecart d'images ou de FAQ est REFUSE, jamais devine", () => {
  // Ces blocs s'apparient par leur RANG, parce que leur `src` a change
  // et que leur texte a ete corrige. Un ecart les decalerait tous, et
  // une image se retrouverait sous le mauvais paragraphe.
  const img = (s: string): Bloc => ({ type: "image", src: s, alt: "" });
  assert.throws(
    () => fusionner([img("/blog/img/a.webp")], [img("/x.png"), img("/y.png")]),
    /s'apparient par leur RANG/,
  );
});

test("un ordre ambigu est REFUSE, il ne se tranche pas au hasard", () => {
  // Si un trou porte a la fois un bloc du disque sans jumeau ET une
  // nouveaute, rien ne dit lequel vient avant l'autre.
  const anciens: Bloc[] = [titre("A"), html("propre au disque, sans aucun rapport"), titre("B")];
  const nouveaux: Bloc[] = [titre("A"), html("propre a la source, totalement different"), titre("B")];
  assert.throws(() => fusionner(anciens, nouveaux), /ordre est ambigu/);
});

// ── CE QUE LA REPARATION NETTOIE ──

test("un titre qui finit l'article n'annonce rien : il part", () => {
  // L'etude de cas de Jocelyne finissait sur "3 lecons a retenir et
  // appliquer", et RIEN ne suivait. On retire au lieu d'ecrire les
  // trois lecons : sa page source n'existe plus, donc elles ne sont
  // recuperables nulle part, et les inventer sur une vraie cliente
  // serait un faux.
  const avec: Bloc[] = [html("du texte"), titre("3 lecons a retenir")];
  assert.equal(retirerTitreOrphelin(avec).length, 1);

  const sain: Bloc[] = [titre("Une section"), html("son contenu")];
  assert.equal(retirerTitreOrphelin(sain).length, 2, "un titre suivi de contenu ne bouge pas");
});

test("le meme paragraphe deux fois : le PREMIER gagne", () => {
  const long = html(
    "Une fois que tu as ce vocabulaire, tu le reinjectes partout dans ton quiz : titre, questions, options.",
  );
  const copie = html(
    "Une fois que tu as ce vocabulaire, tu le reinjectes partout dans ton quiz : titre, questions, options.",
  );
  const out = retirerBlocsEnDouble([long, html("entre les deux"), copie]);
  assert.equal(out.length, 2);
  assert.ok(out.includes(long), "c'est la premiere occurrence qui reste");
});

test("une phrase courte a le droit de se repeter", () => {
  // Un seuil qui crierait sur "C'est tout." finirait desactive.
  const court = html("C'est tout.");
  assert.equal(retirerBlocsEnDouble([court, court]).length, 2);
});

// ── LE TIRET LONG ──

test("un tiret long entoure d'espaces devient une virgule", () => {
  // Regle du 7 juin, absolue. Elle vivait dans un test qui INTERDIT et
  // dans aucune regle qui CORRIGE : un import pouvait donc en rapporter
  // un, et c'est arrive le 8 septembre.
  assert.equal(
    retirerTiretsLongs("ton quiz parle d'education canine — pas d'astrologie canine."),
    "ton quiz parle d'education canine, pas d'astrologie canine.",
  );
});

test("un tiret long ecrit en ENTITE compte autant que le caractere", () => {
  // `&mdash;` s'affiche exactement comme `—`, et le garde qui interdit
  // le tiret long cherchait le CARACTERE : deux em-dash sont entres
  // dans le comparatif des outils le 8 septembre, a travers un test qui
  // ne pouvait pas les voir.
  assert.equal(
    retirerTiretsLongs("<strong>Tiquiz</strong> &mdash; edite par ETHILIFE"),
    "<strong>Tiquiz</strong>, edite par ETHILIFE",
  );
  assert.equal(retirerTiretsLongs("Tiquiz&nbsp;&mdash;&nbsp;en France"), "Tiquiz, en France");
  assert.equal(retirerTiretsLongs("un texte&mdash;colle"), "un texte&mdash;colle");
});

test("un tiret COLLE est une plage, on n'y touche pas", () => {
  // C'est le discriminant : entoure d'espaces il joue une pause forte,
  // colle il compose ou il borne. Le convertir ecrirait autre chose.
  for (const intact of ["la periode 2020–2024", "l'axe Nord–Sud", "un texte sans tiret"]) {
    assert.equal(retirerTiretsLongs(intact), intact);
  }
});

test("la reponctuation retire le tiret long, et elle est idempotente", () => {
  const une = reponctuer("un texte — avec une pause");
  assert.ok(!/[—–]/.test(une));
  assert.equal(reponctuer(une), une, "repasser ne change plus rien");
});
