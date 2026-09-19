// tests/logic/apercu-landing-v2.test.mts
//
// LA MAQUETTE DE BÉNÉ, ET CE QU'ELLE N'A PAS LE DROIT DE PERDRE.
//
// Béné, 19 septembre 2026 : "mets à jour la landing page aperçu pour
// reproduire cette page en exemple... mets le générateur de quiz qui est
// actuellement sur la page. Plus l'option pour l'importer dans le compte
// du nouvel user. Et agrandis un peu la démo."
//
// Son HTML est gardé à l'octet près dans `lib/site/apercuLandingV2.ts`,
// et c'est justement ce qui demande un filet : une copie figée ne suit
// PAS les corrections du reste du dépôt. Elle vieillit en silence.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { OWNER_CATALOG } from "../../lib/checkout/catalog.ts";
import { BAS, CSS_V2, FAQ_JSONLD, HAUT, REVEAL_JS } from "../../lib/site/apercuLandingV2.ts";

function lire(chemin: string): string {
  return readFileSync(new URL(`../../${chemin}`, import.meta.url), "utf8");
}

const PAGE = lire("app/apercu-landing-8f2c9d41/page.tsx");
const CORPS = HAUT + BAS;

// ------------------------------------------- les prix ne vieillissent pas

test("les prix de la maquette sont ceux du catalogue", () => {
  // C'EST LE GARDE-FOU QUI REMPLACE L'EXEMPTION.
  //
  // `prix-source-unique.test.mts` interdit un prix écrit en dur hors du
  // catalogue, et il exempte ce fichier là, parce que le réécrire
  // reviendrait à montrer à Béné autre chose que ce qu'elle a envoyé.
  // L'exemption ne laisse donc pas le trou ouvert : ici on compare les
  // VALEURS, ce que l'autre test ne fait pas.
  //
  // Le jour où un prix bouge dans le catalogue, cette maquette dit un
  // montant qui n'existe plus, et c'est rouge avant le push.
  const texte = CORPS.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  const annonces = new Set(
    [...texte.matchAll(/(\d+)\s*€/g)].map((m) => Number(m[1])).filter((n) => n > 0),
  );

  const duCatalogue = new Set(Object.values(OWNER_CATALOG).map((p) => p.amountCents / 100));
  // Les montants que la maquette a le droit de citer sans être un prix
  // d'abonnement Tiquiz : l'Atelier, et le chiffre d'un témoignage.
  // Chacun est nommé, jamais une plage : une exemption large finirait
  // par couvrir un vrai prix faux.
  const HORS_CATALOGUE = new Set([
    47, // l'Atelier du Quiz
    850, // le chiffre d'un témoignage
    100, // "Plus de 100 € par mois, ou 17 €" : la pile d'outils d'en face,
    79, //  et Typeform Plus. Ce ne sont pas nos prix.
  ]);

  const inconnus = [...annonces].filter(
    (n) => !duCatalogue.has(n) && !HORS_CATALOGUE.has(n),
  );
  assert.deepEqual(
    inconnus,
    [],
    `la maquette annonce un montant que le catalogue ne connaît pas : ${inconnus.join(", ")} €. ` +
      `Le catalogue dit : ${[...duCatalogue].sort((a, b) => a - b).join(", ")} €.`,
  );

  // ET DANS L'AUTRE SENS : les quatre prix du catalogue doivent tous
  // être dans la maquette. Un palier qui disparaîtrait de la page se
  // verrait ainsi, au lieu de manquer en silence.
  for (const prix of duCatalogue) {
    assert.ok(annonces.has(prix), `le palier à ${prix} € n'est plus annoncé dans la maquette`);
  }
});

// ---------------------------------- ce que le découpage devait enlever

test("aucun script n'est resté dans le corps injecté", () => {
  // UN `<script>` POSÉ PAR `innerHTML` NE S'EXÉCUTE JAMAIS.
  //
  // Laissé dedans, il serait là, inerte, et les 112 blocs `.rv`
  // garderaient `opacity:0` : la page serait BLANCHE, et rien dans le
  // code ne le laisserait voir. C'est pour ça qu'ils sont sortis.
  assert.ok(!/<script/i.test(CORPS), "un script est resté dans le HTML injecté");
  assert.ok(REVEAL_JS.includes("IntersectionObserver"), "l'apparition au défilement existe");
  assert.ok(
    REVEAL_JS.includes("classList.add('in')"),
    "le repli sans IntersectionObserver doit TOUT montrer",
  );
  assert.ok(FAQ_JSONLD.includes("FAQPage"), "les questions fréquentes partent chez Google");
});

test("la section de démo a bien été retirée du HTML figé", () => {
  // Sinon la maquette et le vrai générateur seraient TOUS LES DEUX sur
  // la page : deux formulaires qui promettent la même chose, dont un
  // qui fait changer de page.
  assert.ok(!CORPS.includes('id="essai"'), "la maquette de démo est encore dans le HTML");
  assert.ok(
    !CORPS.includes("Écris ton sujet"),
    "le titre de la maquette de démo est encore là",
  );
  // Et elle est bien REMPLACÉE, pas seulement retirée.
  assert.ok(PAGE.includes('<section id="essai">'), "la vraie section de démo a disparu");
  assert.ok(PAGE.includes("<EmbedPreviewClient"), "le vrai générateur n'est pas posé");
});

test("les deux moitiés injectées sont ÉQUILIBRÉES", () => {
  // LE DÉFAUT QUE J'AI FAILLI LIVRER (19 septembre, deuxième envoi).
  //
  // J'avais coupé au milieu de la section de démo, pour ne retirer que
  // le faux formulaire. `HAUT` laissait donc `<section>` et
  // `<div class="wrap">` OUVERTS, et le `<div>` qui héberge le
  // `innerHTML` les aurait refermés tout seul : la page se serait
  // affichée, de travers, et aucun test logique ne l'aurait vu.
  //
  // La coupe est donc sur la SECTION ENTIÈRE, et sa démo est redessinée
  // en JSX. Ce test là mesure l'équilibre, pas l'intention.
  for (const [nom, part] of [["HAUT", HAUT], ["BAS", BAS]] as const) {
    for (const balise of ["div", "section", "p", "ul", "li"]) {
      const ouverts = (part.match(new RegExp(`<${balise}[\\s>]`, "g")) ?? []).length;
      const fermes = (part.match(new RegExp(`</${balise}>`, "g")) ?? []).length;
      assert.equal(ouverts, fermes, `${nom} : ${ouverts} <${balise}> pour ${fermes} fermeture(s)`);
    }
  }
});

test("AUCUNE image n'est en base64 : ce sont toutes des fichiers", () => {
  // Le fichier envoyé pesait 250 Ko, dont 137 Ko pour le MÊME logo
  // collé deux fois et 42 Ko pour les visages des témoignages.
  //
  // Et ça coûtait DOUBLE : un composant serveur sérialise son contenu
  // une fois en HTML et une fois dans la charge RSC. Mesuré sur la page
  // rendue avant l'extraction : 451 Ko.
  //
  // En fichiers, le navigateur les met en cache et ne les retélécharge
  // pas d'une page à l'autre. Une image en base64, jamais.
  assert.ok(
    !/src="data:image/.test(CORPS),
    "une image est revenue en base64 : la page double son poids pour rien",
  );
  assert.equal(
    (CORPS.match(/\/logo-tiquiz\.webp/g) ?? []).length,
    2,
    "le logo doit être servi en fichier, en haut ET en bas",
  );
  // Les visages vivent dans `public/apercu-landing/`. Le test les
  // COMPTE : une image qui disparaîtrait du dossier laisserait un carré
  // vide dans un témoignage, et ça ne casserait rien d'autre.
  const fichiers = [...CORPS.matchAll(/src="(\/apercu-landing\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(fichiers.length >= 10, `seulement ${fichiers.length} image(s) en fichier`);
  for (const f of new Set(fichiers)) {
    assert.doesNotThrow(
      () => readFileSync(new URL(`../../public${f}`, import.meta.url)),
      `${f} est référencée par la maquette et absente de public/`,
    );
  }
});

// ------------------------------------------ le générateur, et sa reprise

test("le générateur posé est le VRAI, avec la reprise dans le compte", () => {
  // `contexte="page"` : hors iframe, `remisePourLeBouton` rend une
  // NAVIGATION vers `/signup?tq_session=…`, et l'inscription rattache le
  // quiz au compte qui vient de naître. C'est ça, "l'option pour
  // l'importer dans le compte du nouvel user" : elle n'est pas recodée
  // ici, elle est héritée. Un deuxième chemin de reprise finirait par
  // perdre des quiz que le premier sait garder.
  assert.ok(PAGE.includes('contexte="page"'), "hors iframe, le bouton doit NAVIGUER");
  assert.ok(!PAGE.includes('contexte="iframe"'), "il n'y a pas d'iframe sur cette page");
});

test("l'aperçu n'écrit pas dans l'entonnoir du vrai générateur", () => {
  // `construireEntonnoirGenerateur` ne compte QUE `page-generateur`.
  // Si l'aperçu écrivait la même porte, chaque essai fait pendant une
  // relecture gonflerait le seul ratio qu'elle regarde pour juger le
  // générateur, et rien ne le dirait.
  //
  // Symétrique exact du drame de `?source=modeles` (8 septembre) : là
  // des générations disparaissaient, ici on en ajouterait des fausses.
  assert.ok(PAGE.includes('const SOURCE_APERCU = "apercu-landing"'), "une porte à part");
  assert.ok(!PAGE.includes("SOURCE_GENERATEUR"), "l'aperçu ne prend pas la porte de la vraie page");
  assert.ok(PAGE.includes("source={SOURCE_APERCU}"), "et c'est bien elle qui est passée");
});

// ------------------------------------------------------- la démo agrandie

test("la démo prend toute la largeur, elle n'est plus dans une colonne", () => {
  // Béné : "agrandis un peu la démo, là elle sera illisible avec cette
  // présentation." Sa grille `.try` est en deux colonnes : sur les
  // 1140 px de la page, ça donne 555 px par colonne.
  // Sa page fait 1236 px et son faux panneau etait borne a 820.
  assert.ok(CSS_V2.includes("max-width:1236px"), "la largeur de sa page a changé, revoir la démo");
  assert.ok(PAGE.includes("apercu-outil"), "le cadre large de l'outil a disparu");
  assert.ok(PAGE.includes("width:min(1180px, 100%)"), "l'outil doit être plus large que 820 px");
  // ET IL GARDE SON STYLE A ELLE. `panel` porte son fond, son rayon de
  // 36 px et son ombre : le nouveau style est applique, pas imite.
  assert.ok(
    PAGE.includes('className="panel colc rv apercu-outil"'),
    "le cadre de l'outil doit être un .panel de SA feuille",
  );
  assert.ok(CSS_V2.includes(".panel{"), "la classe .panel a disparu de sa feuille");
});

test("l'aperçu ne s'indexe pas", () => {
  // Elle reprend mot pour mot des pages qui rankent déjà : indexée,
  // elle se ferait concurrence à elle même sur ses propres mots.
  assert.ok(
    /robots:\s*\{\s*index:\s*false/.test(PAGE),
    "un aperçu qui s'indexe cannibalise les vraies pages",
  );
});

test("l'ancienne landing courte est toujours là, pour comparer", () => {
  // Elle a un vrai quiz interactif en haut de page et des liens vers les
  // 8 pages `/fonctionnalites/<slug>` ; la maquette n'a ni l'un ni
  // l'autre (mesuré : zéro lien). Supprimer la courte ferait disparaître
  // la comparaison ET trois fichiers de garde-fous avec elle.
  const courte = lire("app/(site)/apercu-landing-court/page.tsx");
  assert.ok(courte.length > 10_000, "la landing courte a disparu");
  // LE PREMIER ENVOI N'EN AVAIT AUCUN, et je le lui avais signalé : ce
  // sont les 8 pages qui commencent à ranker, et elles perdaient leurs
  // liens internes. Le deuxième envoi en porte 16. On les EXIGE
  // maintenant, pour qu'une prochaine version ne les reperde pas en
  // silence.
  const liens = (CORPS.match(/\/fonctionnalites\//g) ?? []).length;
  assert.ok(liens >= 8, `la maquette ne porte plus que ${liens} lien(s) vers /fonctionnalites`);
});
