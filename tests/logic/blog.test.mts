// tests/logic/blog.test.mts
//
// LE BLOG RAPATRIÉ DEPUIS SYSTEME.IO (Béné, 29 août 2026).
//
// "Sinon oui mon blog sur tiquiz.fr/blog. Je vais supprimer les
// anciennes versions dans la foulée. Profites-en pour mettre à jour
// l'affiliation, les liens, les prix etc..."
//
// Ce fichier tient les promesses qui coûteraient cher si elles
// cassaient en silence : un prix périmé sur une page de vente
// indirecte, un lien vers une page supprimée, une image qui n'existe
// pas, ou un slug qui ouvre un fichier du serveur.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { lireArticle, listerArticles, tousLesSlugs } from "../../lib/blog/articles.ts";
import { estHrefSur, attributsLien, minutesDeLecture, nettoyerBloc, sommaire, texteBrut } from "../../lib/blog/rendu.ts";
import { jsonLdArticle, jsonLdFaq, jsonLdFilDAriane, ORIGINE_BLOG, urlArticle } from "../../lib/blog/seo.ts";
import { reponctuer } from "../../lib/blog/reponctuation.ts";

const ARTICLES = listerArticles();
const COMPLETS = tousLesSlugs().map((s) => lireArticle(s)!);

function toutLeTexte(): string {
  return JSON.stringify(COMPLETS);
}

// ── LE CONTENU EST BIEN LÀ ──

test("les dix articles sont importes, du plus recent au plus ancien", () => {
  assert.equal(ARTICLES.length, 10);
  const dates = ARTICLES.map((a) => a.publieLe);
  assert.deepEqual([...dates].sort().reverse(), dates, "l'index doit etre trie du plus recent");
});

test("chaque article a un titre, une description et une date lisible", () => {
  for (const a of COMPLETS) {
    assert.ok(a.titre.length > 10, a.slug);
    assert.ok(a.description.length > 30, a.slug);
    assert.match(a.publieLe, /^\d{4}-\d{2}-\d{2}$/, a.slug);
    // Un gabarit non résolu (`%BLOG_POST_TITLE%`) passait sans bruit :
    // c'est arrivé sur l'article de Jocelyne, dont la page est un
    // `blog_static` sans métadonnées. On cherche le GABARIT, pas le
    // signe `%` : une description qui annonce "40 % de commission" est
    // parfaitement normale.
    assert.ok(!/%[A-Z_]+%/.test(a.titre), `${a.slug} : titre non resolu`);
    assert.ok(!/%[A-Z_]+%/.test(a.description), `${a.slug} : description non resolue`);
    assert.ok(a.blocs.length > 10, `${a.slug} : ${a.blocs.length} blocs seulement`);
  }
});

// ── CE QUI A ÉTÉ MIS À JOUR À L'IMPORT ──

test("aucun ancien prix ne survit dans le corpus", () => {
  // Un article qui annonce 9 EUR quand l'abonnement en coute 17 est une
  // promesse qu'on ne tient pas, et c'est le lecteur qui la decouvre au
  // bon de commande.
  const texte = toutLeTexte();
  assert.ok(!texte.includes("9 €/mois"), "ancien prix mensuel");
  assert.ok(!texte.includes("90 €/an"), "ancien prix annuel");
  assert.ok(!texte.includes("3,60 €"), "ancienne commission (40 % de 9 €)");
  assert.ok(!texte.includes("1,80 €"), "ancienne commission a 20 %");
  assert.ok(!texte.includes("43,20 €"), "ancienne rente annuelle par filleul");
});

test("l'arithmetique de l'article d'affiliation est refaite, pas rafistolee", () => {
  // 40 % de 17 € font 6,80 €. Remplacer le prix sans refaire le calcul
  // aurait laisse "17 €/mois = 3,60 €", donc un prix juste et un
  // resultat faux : pire que de n'avoir rien touche.
  const a = lireArticle("rente-mensuelle-affiliation-tiquiz")!;
  const texte = JSON.stringify(a);
  assert.ok(texte.includes("6,80 €"), "la commission mensuelle recalculee");
  assert.ok(texte.includes("204 €/mois"), "30 filleuls a 6,80 €");
  assert.ok(texte.includes("81,60 €"), "la rente annuelle par filleul");
  assert.ok(texte.includes("68 € de rente par filleul et par an"), "40 % de 170 €");
});

test("plus aucun lien vers les pages qui vont disparaitre", () => {
  const texte = toutLeTexte();
  assert.ok(!texte.includes("tipote.fr/tiquiz"), "ancienne page de vente");
  assert.ok(!texte.includes("tipote.fr/part-tiquiz"), "ancien tunnel d'affiliation");
  // Un article qui renvoie vers un AUTRE ARTICLE le fait par un chemin
  // relatif : le blog doit rester consultable quel que soit le domaine
  // qui le sert.
  const slugs = ARTICLES.map((a) => a.slug);
  for (const a of COMPLETS) {
    for (const b of a.blocs) {
      if (b.type !== "html") continue;
      for (const s of slugs) {
        assert.ok(
          !b.html.includes(`tipote.fr/${s}`),
          `${a.slug} : lien absolu vers l'ancienne adresse de ${s}`,
        );
      }
    }
  }
});

test("le lien vers l'Atelier mene a SON domaine, plus au tunnel Systeme.io", () => {
  // CETTE EXCEPTION A ETE LEVEE LE 30 AOUT, et il faut dire pourquoi
  // sinon le prochain passage la remet.
  //
  // Jusqu'au 25 aout, le lien restait chez Systeme.io parce que
  // l'Atelier tenait son PROPRE registre d'affilies et ne lisait que
  // `?sa=`. Verifie ligne par ligne dans son depot le 30 aout : ce
  // n'est plus vrai. `atelierduquiz.fr` est un hote de vente, donc son
  // middleware capte le `?ref=` ; son bon de commande le transporte ; et
  // `commissionnerVente` interroge le registre CENTRAL de Tipote en
  // premier, avec `source_app: "atelier"` (c'est ce champ qui fixe les
  // 70 %). Le registre historique n'est plus qu'un repli.
  //
  // Laisser le lien la-bas envoyait donc les lecteurs sur un tunnel qui
  // ne nous transmet rien, alors que notre domaine commissionne.
  const texte = toutLeTexte();
  assert.ok(!texte.includes("tipote.fr/atelier-du-quiz"), "ancien tunnel Systeme.io");
  assert.ok(texte.includes("atelierduquiz.fr"), "le domaine de l'Atelier");
});

test("aucun lien de LECTURE ne mene a l'espace affilie", () => {
  // Bene, 30 aout : "certains liens sont debiles comme 'C'est pour ca
  // que Tiquiz existe' qui mene vers l'affiliate center et pas vers
  // Tiquiz". Sept liens de ce genre existaient : le lecteur clique pour
  // essayer le produit et tombe sur un ecran de connexion qui ne le
  // concerne pas.
  //
  // Le tableau de bord reste cite dans l'article d'affiliation, la ou
  // c'est justement ce dont on parle : la regle porte donc sur le
  // COUPLE (destination, texte du lien), pas sur l'URL seule.
  for (const a of COMPLETS) {
    for (const b of a.blocs) {
      const fragments =
        b.type === "html" ? [b.html]
        : b.type === "faq" ? b.questions.map((q) => q.reponse)
        : [];
      for (const html of fragments) {
        for (const m of html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
          if (!m[1].includes("affiliate.tipote.com")) continue;
          const texteDuLien = m[2].replace(/<[^>]+>/g, "");
          assert.ok(
            /affiliate\.tipote\.com/i.test(texteDuLien),
            `${a.slug} : "${texteDuLien.slice(0, 50)}" mene a l'espace affilie`,
          );
        }
      }
      if (b.type === "cta") {
        assert.ok(
          !b.url.includes("affiliate.tipote.com"),
          `${a.slug} : le bouton "${b.texte}" mene a l'espace affilie`,
        );
      }
    }
  }
});

test("aucune URL concatenee par l'import ne survit", () => {
  // `systeme.io/fr?sa=<id>fr/blog/exemples-lead-magnets` : le lien
  // affilie de Bene a ete recolle DEVANT un chemin. Ces quatre URL
  // etaient MORTES, personne n'a jamais pu les suivre, et rien ne les
  // signalait puisque le TEXTE du lien, lui, etait juste.
  const texte = toutLeTexte();
  assert.ok(!/\?sa=[a-z0-9]+fr[/?]/i.test(texte), "lien affilie colle devant un chemin");
});

test("aucun lien externe n'est en http nu", () => {
  // Un `http://` en 2026 declenche un avertissement du navigateur, et
  // c'est NOUS qui envoyons le lecteur dessus.
  for (const a of COMPLETS) {
    for (const b of a.blocs) {
      const brut = JSON.stringify(b);
      assert.ok(!/"http:\/\//.test(brut) && !/href=\\"http:\/\//.test(brut), `${a.slug} : lien en clair`);
    }
  }
});

test("aucun guillemet ne reste colle a son mot", () => {
  // L'import a remplace les chevrons par des guillemets droits et a
  // emporte l'espace qui les entourait : `Donc"c'est gratuit"`,
  // `conversion"a une maman`. 46 occurrences, invisibles a la relecture
  // rapide parce que la phrase, elle, est juste.
  //
  // LE TEST APPELLE LA MEME FONCTION QUE LA REPARATION
  // (`scripts/reparer-blog.mjs`). Une regle recopiee ici finirait par
  // accepter ce que le script corrige, ou l'inverse : c'est le motif des
  // deux listes qui divergent, paye quatre fois dans ce depot.
  //
  // Le contenu est propre quand la reparation ne change RIEN : c'est la
  // definition la plus courte, et elle ne peut pas mentir.
  for (const a of COMPLETS) {
    for (const b of a.blocs) {
      const fragments =
        b.type === "html" ? [b.html]
        : b.type === "titre" ? [b.texte]
        : b.type === "cta" ? [b.texte]
        : b.type === "faq" ? b.questions.flatMap((q) => [q.question, q.reponse])
        : [];
      for (const html of fragments) {
        assert.equal(reponctuer(html), html, `${a.slug} : ponctuation collee`);
      }
    }
    assert.equal(reponctuer(a.titre), a.titre, `${a.slug} : titre`);
    assert.equal(reponctuer(a.description), a.description, `${a.slug} : description`);
  }
});

test("la reponctuation met l'espace du BON cote", () => {
  // Le piege : un guillemet ouvrant veut l'espace AVANT, un fermant la
  // veut APRES. Une regle qui ne compte pas les guillemets mettrait
  // l'espace du mauvais cote dans un cas sur deux, et personne ne le
  // verrait en relisant une liste de remplacements.
  assert.equal(reponctuer('<p>Donc"c\'est gratuit" ok</p>'), '<p>Donc "c\'est gratuit" ok</p>');
  assert.equal(reponctuer("<p>parles \"funnel\"a une maman</p>"), "<p>parles \"funnel\" a une maman</p>");
  // Un guillemet DANS un attribut n'est pas une citation : on n'y touche
  // pas, sinon on casse le HTML.
  const lien = '<a href="https://x.fr" title="a">t</a>';
  assert.equal(reponctuer(lien), lien);
  // Et ce qui est deja propre ne bouge pas : le script est idempotent.
  const propre = '<p>Il a dit "oui", puis il est parti.</p>';
  assert.equal(reponctuer(propre), propre);
});

test("l'affiliation ne parle plus du code Systeme.io", () => {
  // Le code public est le notre depuis le 24 aout. Envoyer l'affilie
  // chercher un "code qui commence par sa" le renvoie dans un espace
  // qui ne le paie plus.
  const a = lireArticle("rente-mensuelle-affiliation-tiquiz")!;
  const texte = JSON.stringify(a);
  assert.ok(!/commence par ?"sa"/.test(texte), "ancien identifiant Systeme.io");
  assert.ok(!/dashboard Systeme io/i.test(texte), "ancien espace affilie");
  assert.ok(texte.includes("affiliate.tipote.com"), "l'espace affilie actuel");
  assert.ok(texte.includes("?ref="), "le code public actuel");
});

test("les regles d'ecriture de Bene tiennent sur le contenu importe", () => {
  const texte = toutLeTexte();
  assert.ok(!/[—–]/.test(texte), "tiret cadratin ou demi-cadratin");
  assert.ok(!/[«»]/.test(texte), "chevrons");
  assert.ok(!/\b\w+·e\b/.test(texte), "point median");
});

// ── LES IMAGES ──

test("chaque image citee existe vraiment sur le disque", () => {
  // Une image manquante ne casse rien au build : elle laisse un cadre
  // vide dans l'article, et personne ne le voit avant un lecteur.
  for (const a of COMPLETS) {
    const chemins = [
      ...(a.couverture ? [a.couverture] : []),
      ...a.blocs.flatMap((b) => (b.type === "image" ? [b.src] : [])),
    ];
    for (const c of chemins) {
      assert.ok(c.startsWith("/blog/img/"), `${a.slug} : ${c} n'est pas servi par nous`);
      assert.ok(
        fs.existsSync(path.join(process.cwd(), "public", c)),
        `${a.slug} : ${c} absent de public/`,
      );
    }
  }
});

test("aucune image ne pointe encore sur le CDN de Systeme.io", () => {
  // C'est tout l'objet du rapatriement : le jour ou l'abonnement
  // s'arrete, un blog qui hotlinke perd tous ses visuels d'un coup.
  assert.ok(!toutLeTexte().includes("cloudfront.net"), "image restee chez eux");
});

// ── LA LECTURE D'UN ARTICLE ──

test("un slug ne peut pas servir a lire un fichier du serveur", () => {
  // `path.join` accepte parfaitement `../../.env`.
  assert.equal(lireArticle("../../.env"), null);
  assert.equal(lireArticle("../package"), null);
  assert.equal(lireArticle(""), null);
  assert.equal(lireArticle("MAJUSCULES"), null);
});

test("un slug inconnu rend null, il ne jette pas", () => {
  assert.equal(lireArticle("article-qui-nexiste-pas"), null);
});

// ── LE RENDU ──

test("le HTML d'un article ne peut pas porter de script", () => {
  const sale = '<p>ok</p><script>alert(1)</script><iframe src="x"></iframe><p onclick="x()">non</p>';
  const propre = nettoyerBloc(sale);
  assert.ok(!propre.includes("script"), propre);
  assert.ok(!propre.includes("iframe"), propre);
  assert.ok(!propre.includes("onclick"), propre);
  assert.ok(propre.includes("<p>ok</p>"));
});

test("un lien javascript: est neutralise, son texte reste", () => {
  const propre = nettoyerBloc('<p><a href="javascript:alert(1)">clique</a></p>');
  assert.ok(!propre.includes("javascript"), propre);
  assert.ok(propre.includes("clique"), "le texte du lien ne disparait pas");
  assert.equal(estHrefSur("javascript:alert(1)"), false);
  assert.equal(estHrefSur("data:text/html,x"), false);
  assert.equal(estHrefSur("/blog/x"), true);
  assert.equal(estHrefSur("https://exemple.fr"), true);
});

test("un lien SORTANT s'ouvre ailleurs, un lien interne non", () => {
  // Regle du 24 aout : un visiteur au milieu d'un article qui clique
  // une source part, et il ne revient pas.
  assert.ok(attributsLien("https://systeme.io").includes('target="_blank"'));
  assert.ok(attributsLien("https://systeme.io").includes("noopener"));
  assert.equal(attributsLien("/blog/vendre-avec-un-quiz"), "");
  assert.equal(attributsLien("#un-titre"), "");
  const propre = nettoyerBloc('<p><a href="https://exemple.fr">source</a></p>');
  assert.ok(propre.includes('target="_blank"'), propre);
});

test("le sommaire EST les titres, il ne peut pas diverger", () => {
  for (const a of COMPLETS) {
    const toc = sommaire(a.blocs);
    const titres = a.blocs.filter((b) => b.type === "titre");
    assert.equal(toc.length, titres.length, a.slug);
    // Deux titres identiques dans un article donneraient deux ancres
    // identiques, donc un lien de sommaire qui saute au mauvais
    // endroit.
    assert.equal(new Set(toc.map((e) => e.id)).size, toc.length, `${a.slug} : ancres en double`);
    for (const e of toc) assert.match(e.id, /^[a-z0-9-]+$/, `${a.slug} : ancre ${e.id}`);
  }
});

test("le temps de lecture est plausible, jamais zero", () => {
  for (const a of COMPLETS) {
    const m = minutesDeLecture(a.blocs);
    assert.ok(m >= 1, a.slug);
    assert.ok(m <= 40, `${a.slug} : ${m} min, un article ne fait pas ca`);
  }
  assert.equal(minutesDeLecture([]), 1, "jamais zero minute");
});

test("texteBrut retire les balises sans coller les mots", () => {
  assert.equal(texteBrut("<p>un</p><p>deux</p>"), "un deux");
  assert.equal(texteBrut("a&nbsp;b"), "a b");
});

// ── LE SEO ET LE GEO ──

test("la canonique designe NOTRE adresse, jamais l'ancienne", () => {
  // Laisser la canonique sur tipote.fr reviendrait a dire a Google "la
  // vraie page est ailleurs", donc a garantir de ne jamais ranker.
  for (const a of ARTICLES) {
    assert.equal(urlArticle(a.slug), `${ORIGINE_BLOG}/blog/${a.slug}`);
    assert.ok(!urlArticle(a.slug).includes("tipote.fr"));
  }
});

test("le JSON-LD d'un article porte ce qu'un moteur attend", () => {
  const a = lireArticle("vendre-avec-un-quiz")!;
  const ld = jsonLdArticle(a) as Record<string, unknown>;
  assert.equal(ld["@type"], "BlogPosting");
  assert.equal(ld.headline, a.titre);
  assert.equal(ld.datePublished, a.publieLe);
  assert.equal(ld.inLanguage, "fr-FR");
  assert.ok((ld.author as Record<string, string>).name.length > 0);
  assert.ok(String(ld.url).startsWith(ORIGINE_BLOG));
});

test("une FAQPage n'est declaree que si l'article a vraiment des questions", () => {
  // Declarer une FAQPage vide est le genre de balisage qui fait retirer
  // les autres.
  let avec = 0;
  for (const a of COMPLETS) {
    const faq = jsonLdFaq(a) as { mainEntity?: unknown[] } | null;
    const questions = a.blocs.flatMap((b) => (b.type === "faq" ? b.questions : []));
    if (questions.length === 0) {
      assert.equal(faq, null, a.slug);
    } else {
      avec += 1;
      assert.equal(faq?.mainEntity?.length, questions.length, a.slug);
    }
  }
  assert.ok(avec > 0, "aucun article n'a de FAQ : l'import a perdu quelque chose");
});

test("le fil d'Ariane remonte au blog", () => {
  const ld = jsonLdFilDAriane(ARTICLES[0]) as { itemListElement: { item: string }[] };
  assert.equal(ld.itemListElement.length, 2);
  assert.equal(ld.itemListElement[0].item, `${ORIGINE_BLOG}/blog`);
});

// ── LA PORTE ──

test("le blog est PUBLIC dans le middleware", () => {
  // Sans cette ligne, chaque article renvoie vers /login : un blog
  // derriere une connexion ne ramene personne et ne ranke sur rien.
  const src = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
  assert.ok(src.includes('pathname === "/blog"'), "l'index n'est pas ouvert");
  assert.ok(src.includes('pathname.startsWith("/blog/")'), "les articles ne sont pas ouverts");
});

test("les articles sont dans le sitemap du domaine de vente", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "app/sitemap.ts"), "utf8");
  assert.ok(src.includes("listerArticles"), "le sitemap de vente ignore le blog");
});

// ── LA MARQUE, SUR LA PAGE DE VENTE ──
//
// Béné, 29 août : "la page de vente tiquiz.fr ne ranke pas du tout sur
// google quand je tape simplement tiquiz." Sur une requête de marque,
// un moteur cherche à relier un NOM à un SITE.

test("la page de vente publique se declare comme le site de Tiquiz", async () => {
  const { buildHeadTags } = await import("../../lib/sales/servePage.ts");
  const tags = buildHeadTags({
    slug: "tiquiz",
    canonical: "https://tiquiz.fr/",
    title: "Tiquiz",
    description: "Un outil de quiz.",
    locale: "fr_FR",
    marque: {
      nom: "Tiquiz",
      logo: "https://tiquiz.fr/blog/img/logo.webp",
      sameAs: ["https://quiz.tipote.com/"],
      produit: { offres: [{ nom: "Tiquiz mensuel", prix: "17.00", url: "https://tiquiz.fr/commande/mensuel" }] },
    },
  });
  assert.ok(tags.includes("application/ld+json"), "aucune donnee structuree");
  const json = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(tags)![1];
  // Le JSON est inséré dans un `<script>` : une balise fermante à
  // l'intérieur d'une chaîne fermerait le script et casserait la page.
  assert.ok(!json.includes("<"), "un < non echappe casserait le script");
  const donnees = JSON.parse(json.replace(/\\u003c/g, "<")) as { "@graph": Record<string, unknown>[] };
  const types = donnees["@graph"].map((n) => n["@type"]);
  assert.ok(types.includes("Organization"), types.join(","));
  assert.ok(types.includes("WebSite"), types.join(","));
  const orga = donnees["@graph"].find((n) => n["@type"] === "Organization")!;
  assert.equal(orga.name, "Tiquiz");
  assert.equal(orga.url, "https://tiquiz.fr/");
});

test("un APERCU ne se declare PAS comme le site officiel", () => {
  // Deux pages qui pretendent etre le site de Tiquiz se feraient
  // concurrence sur exactement la meme requete.
  const src = fs.readFileSync(path.join(process.cwd(), "app/apercu/vente/[slug]/route.ts"), "utf8");
  assert.ok(
    /const marque = publique \? MARQUES\[slug\] : undefined;/.test(src),
    "la marque doit etre gatee sur le domaine public",
  );
});

test("les prix annonces aux moteurs viennent du catalogue", async () => {
  // Un tarif recopie a la main et un tarif au bon de commande finissent
  // par diverger, et c'est Google qui affiche l'ancien.
  const src = fs.readFileSync(path.join(process.cwd(), "app/apercu/vente/[slug]/route.ts"), "utf8");
  assert.ok(src.includes("OWNER_CATALOG"), "les offres doivent venir du catalogue");
  assert.ok(!/prix: "\d/.test(src), "un prix ecrit en dur");
});

// ── LES FAITS DU PROGRAMME D'AFFILIATION (31 août 2026) ──────────────
//
// Béné : "vérifier que chaque affilié reçoit les bonnes infos."
//
// La FAQ de l'article d'affiliation portait cinq faits, dont quatre
// faux : deux calculs restés à l'ancien tarif (108 € au lieu de 204,
// 1 800 € au lieu de 3 400), un versement annoncé "le 10" au lieu
// d'"entre le 10 et le 13", et surtout **"Pas de seuil de versement à
// atteindre"** alors qu'il y en a un, 20 €.
//
// Le dernier est le plus cher : il ne se découvre qu'au premier
// virement, et c'est le blog qui recrute. Même famille que les CGV du
// 22 août, dont l'article 5 annonçait une renonciation que l'écran ne
// recueillait pas.

test("le blog ne contredit plus le programme d'affiliation", async () => {
  const { faitsFaux } = await import("@/lib/blog/faitsProgramme");
  const dossier = path.join(process.cwd(), "content", "blog");
  for (const f of fs.readdirSync(dossier).filter((n) => n.endsWith(".json"))) {
    const brut = fs.readFileSync(path.join(dossier, f), "utf8");
    const faux = faitsFaux(brut);
    assert.equal(faux.length, 0, `${f} porte encore : ${faux.join(" | ")}`);
  }
});

test("LA RÉPARATION NE CHANGE PLUS RIEN : le contenu déployé est propre", async () => {
  // Le TEST APPELLE LA MÊME FONCTION que `npm run blog:reparer`. Deux
  // copies de la règle finiraient par ne plus être d'accord, et c'est
  // la copie muette qui gagnerait.
  const { corrigerFaits } = await import("@/lib/blog/faitsProgramme");
  const dossier = path.join(process.cwd(), "content", "blog");
  for (const f of fs.readdirSync(dossier).filter((n) => n.endsWith(".json"))) {
    const brut = fs.readFileSync(path.join(dossier, f), "utf8");
    assert.equal(corrigerFaits(brut), brut, `${f} n'est pas a jour : relance npm run blog:reparer`);
  }
});

test("LE CONTRÔLE VOIT UNE ESPACE INSÉCABLE, sinon il ment", async () => {
  // C'est l'erreur faite en écrivant cette règle : le motif portait une
  // espace ordinaire, l'article une INSÉCABLE. Le remplacement ne
  // trouvait rien, ET le contrôle répondait "tout va bien" sur un
  // article qui portait encore le mauvais chiffre.
  //
  // Un contrôle qui ne distingue pas ce qu'il est censé distinguer est
  // pire qu'un contrôle absent (leçon des clés Supabase, 22 août).
  const { faitsFaux, corrigerFaits } = await import("@/lib/blog/faitsProgramme");
  const avecInsecable =
    "Avec 50 filleuls actifs sur l'annuel, ta rente atteint 1 800 € par an.";
  assert.equal(faitsFaux(avecInsecable).length, 1, "l'insecable doit etre vue");
  assert.ok(corrigerFaits(avecInsecable).includes("3 400"), corrigerFaits(avecInsecable));
});

test("les montants annoncés se CALCULENT, ils ne se recopient pas", async () => {
  // 6,80 € et 68 € doivent tomber du prix et du taux, sinon un
  // changement de tarif laisserait encore des calculs à l'ancien prix :
  // c'est exactement ce qui a produit le 108 €.
  const { RENTE_PAR_FILLEUL } = await import("@/lib/blog/faitsProgramme");
  assert.equal(Math.round(RENTE_PAR_FILLEUL.mensuel * 100) / 100, 6.8);
  assert.equal(RENTE_PAR_FILLEUL.annuel, 68);
});
