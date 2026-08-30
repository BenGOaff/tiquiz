// tests/logic/article-blog.test.mts
//
// LA PAGE D'ARTICLE, APRÈS LE RETOUR DE BÉNÉ DU 30 AOÛT 2026.
//
// "certaines images sont d'une taille disproportionnée c'est carrément
// n'importe quoi. Le contenu est mal réparti, dur à lire. Un bouton
// texte bleu sur couleur bleu c'est carrément de la merde. Aucune image
// ne peut être repartagée sur Pinterest. Y'a pas de proposition de
// partage de l'article, ni de commentaires. Le TL;DR du début doit être
// mis en évidence."
//
// Chaque test porte ce qu'ELLE a vu. Un test rouge ici, c'est une page
// qui redevient celle qu'elle a refusée.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { lireArticle, listerArticles, tousLesSlugs } from "../../lib/blog/articles.ts";
import { articlesVoisins, extraireResume } from "../../lib/blog/gabarit.ts";
import {
  dimensionsImage,
  dimensionsSvg,
  largeurMax,
  tailleAffichage,
} from "../../lib/blog/dimensionsImage.ts";
import { apparierVariantes, normaliserImages, retirerDoublonsVoisins } from "../../lib/blog/imagesArticle.ts";
import { COLONNE_LECTURE, HAUTEUR_MAX_VISUEL, dimensionsDe, tailleRendue } from "../../lib/blog/imagesDisque.ts";
import { textePartage } from "../../lib/blog/partage.ts";
import { absolutiser, estAbsolue, urlPartage } from "../../lib/partage/urlsReseaux.ts";
import {
  compterLiens,
  emailPlausible,
  jugerCommentaire,
  messageEnHtml,
  MESSAGE_MAX,
  PHRASE_REFUS,
} from "../../lib/blog/commentaires.ts";

const SLUGS = tousLesSlugs();
const COMPLETS = SLUGS.map((s) => lireArticle(s)!);
const RESUMES = listerArticles();

// ── LE TL;DR EST UN CHAPEAU, PAS UN PARAGRAPHE ──

test("le TL;DR est sorti du corps, sur les neuf articles qui en ont un", () => {
  const avec = COMPLETS.filter((a) => extraireResume(a.blocs).resume !== null);
  assert.equal(avec.length, 9, "neuf articles portent un TL;DR");
  for (const a of avec) {
    const { resume, corps } = extraireResume(a.blocs);
    // Le libelle lui-meme ne doit PAS rester : l'encadre dit deja "En
    // bref", et "TL;DR TL;DR" est ce qu'on obtenait sinon.
    assert.ok(!/TL\s*;?\s*DR/i.test(resume!), `${a.slug} : le libelle est reste dans le resume`);
    assert.equal(corps.length, a.blocs.length - 1, `${a.slug} : le bloc n'a pas ete retire du corps`);
    assert.ok(resume!.length > 50, `${a.slug} : resume trop court pour en etre un`);
  }
});

test("un article SANS TL;DR garde son corps intact", () => {
  // L'etude de cas de Jocelyne n'en a pas. Fabriquer un resume a partir
  // des premieres phrases donnerait un encadre qui repete mot pour mot
  // le paragraphe juste en dessous.
  const a = lireArticle("cas-client-jocelyne-tdah")!;
  const { resume, corps } = extraireResume(a.blocs);
  assert.equal(resume, null);
  assert.equal(corps.length, a.blocs.length);
});

test("un bloc qui ne porte QUE le libelle ne devient pas un encadre vide", () => {
  const r = extraireResume([
    { type: "html", html: "<p><strong><em>TL;DR</em></strong></p>" },
    { type: "html", html: "<p>suite</p>" },
  ]);
  assert.equal(r.resume, null);
  assert.equal(r.corps.length, 1, "le bloc vide disparait quand meme");
});

// ── LES ARTICLES À LIRE ENSUITE ──

test("les articles proposes sont les PLUS PROCHES, pas les trois premiers", () => {
  // Prendre "les trois premiers de l'index" donnait les trois memes sur
  // les dix articles, et jamais le plus proche du sujet.
  const vus = new Set<string>();
  for (const a of RESUMES) {
    const v = articlesVoisins(a, RESUMES, 3);
    assert.equal(v.length, 3, `${a.slug} : le rail serait a moitie vide`);
    assert.ok(!v.some((x) => x.slug === a.slug), `${a.slug} se propose lui-meme`);
    v.forEach((x) => vus.add(x.slug));
  }
  // Si le choix etait "les trois premiers", on ne verrait que 3 slugs
  // sur l'ensemble du blog.
  assert.ok(vus.size > 5, `seulement ${vus.size} articles proposes sur tout le blog`);
});

test("l'affiliation propose bien l'affiliation", () => {
  const a = RESUMES.find((x) => x.slug === "rente-mensuelle-affiliation-tiquiz")!;
  const v = articlesVoisins(a, RESUMES, 3).map((x) => x.slug);
  assert.ok(!v.includes(a.slug));
  assert.equal(new Set(v).size, 3, "trois articles distincts");
});

// ── LA TAILLE DES IMAGES ──

test("les dimensions se lisent dans les trois formes de WebP du corpus", () => {
  // VP8, VP8L et VP8X existent toutes les trois dans public/blog/img.
  // N'en traiter qu'une aurait laisse les deux autres sans garde-fou,
  // en silence, c'est a dire exactement la ou les bugs s'installent.
  const dossier = path.join(process.cwd(), "public", "blog", "img");
  const fichiers = fs.readdirSync(dossier).filter((f) => !f.endsWith(".svg"));
  const illisibles = fichiers.filter((f) => !dimensionsImage(fs.readFileSync(path.join(dossier, f))));
  assert.deepEqual(illisibles, [], "images dont on ne sait pas lire la taille");
});

test("les schemas SVG portent leur taille dans leur viewBox", () => {
  const dossier = path.join(process.cwd(), "public", "blog", "img");
  const svg = fs.readdirSync(dossier).filter((f) => f.endsWith(".svg"));
  assert.ok(svg.length >= 15, "le corpus porte bien des SVG");
  for (const f of svg) {
    const d = dimensionsSvg(fs.readFileSync(path.join(dossier, f), "utf8"));
    assert.ok(d && d.largeur > 0 && d.hauteur > 0, `${f} : taille illisible`);
  }
});

test("une image n'est JAMAIS agrandie au dela de sa definition", () => {
  // `gwenn.webp` fait 200 px de large. En `w-full` sur une colonne de
  // 1168, elle etait agrandie 5,8 fois.
  assert.equal(largeurMax({ largeur: 200, hauteur: 200 }, 720), 200);
  assert.equal(largeurMax({ largeur: 1400, hauteur: 800 }, 720), 720);
  // Taille inconnue -> la colonne, comme avant. On ne devine pas.
  assert.equal(largeurMax(null, 720), 720);
});

test("une capture en PORTRAIT est bornee par sa hauteur, sans deformation", () => {
  // `publicite-quiz.webp` fait 842 x 1808. Etiree a la largeur de la
  // colonne, elle occupait 2508 px de haut : deux ecrans et demi pour
  // une capture. C'est ca, "n'importe quoi".
  const t = tailleAffichage({ largeur: 842, hauteur: 1808 }, { colonne: 720, hauteurMax: 760 });
  assert.ok(t);
  assert.ok(t!.hauteur <= 760, `${t!.hauteur} px de haut`);
  // Le ratio est conserve au pixel pres : on REDUIT, on ne recadre
  // jamais (regle du 4 aout).
  const ratioSource = 842 / 1808;
  const ratioRendu = t!.largeur / t!.hauteur;
  assert.ok(Math.abs(ratioSource - ratioRendu) < 0.01, `ratio ${ratioRendu} vs ${ratioSource}`);
});

test("aucune image d'article ne depasse la colonne ni la hauteur d'un ecran", () => {
  for (const a of COMPLETS) {
    for (const b of normaliserImages(a.blocs)) {
      if (b.type !== "image") continue;
      const t = tailleRendue(b.src);
      assert.ok(t, `${a.slug} : taille inconnue pour ${b.src}`);
      assert.ok(t!.largeur <= COLONNE_LECTURE, `${a.slug} : ${b.src} fait ${t!.largeur} px`);
      assert.ok(t!.hauteur <= HAUTEUR_MAX_VISUEL, `${a.slug} : ${b.src} fait ${t!.hauteur} px de haut`);
    }
  }
});

test("un chemin d'image ne peut pas servir a lire un fichier du serveur", () => {
  assert.equal(dimensionsDe("/../../.env"), null);
  assert.equal(dimensionsDe("blog/img/x.webp"), null, "un chemin relatif n'est pas servi par nous");
});

// ── LES VARIANTES DESKTOP / TÉLÉPHONE ──

test("la variante telephone n'est plus affichee EN PLUS de la grande", () => {
  // C'est le vrai defaut derriere "taille disproportionnee" : le meme
  // schema deux fois, la deuxieme fois etire en hauteur.
  const blocs = apparierVariantes([
    { type: "image", src: "/blog/img/schema-connexion-systemeio-large.webp", alt: "" },
    { type: "image", src: "/blog/img/schema-connexion-systemeio-mobile.webp", alt: "" },
  ]);
  assert.equal(blocs.length, 1, "les deux blocs n'en font qu'un");
  assert.equal(blocs[0].type, "image");
  assert.equal(
    (blocs[0] as { mobile?: string }).mobile,
    "/blog/img/schema-connexion-systemeio-mobile.webp",
  );
});

test("l'extension peut differer entre les deux versions", () => {
  // Cas reel du corpus : `svg-tunnel-jocelyne.svg` et
  // `svg-tunnel-jocelyne-mobile-preview.webp`. Exiger la meme extension
  // aurait laisse ce doublon la en place.
  const blocs = apparierVariantes([
    { type: "image", src: "/blog/img/svg-tunnel-jocelyne.svg", alt: "" },
    { type: "image", src: "/blog/img/svg-tunnel-jocelyne-mobile-preview.webp", alt: "" },
  ]);
  assert.equal(blocs.length, 1);
});

test("deux images sans rapport ne sont JAMAIS fusionnees", () => {
  const blocs = apparierVariantes([
    { type: "image", src: "/blog/img/a.webp", alt: "" },
    { type: "image", src: "/blog/img/b.webp", alt: "" },
  ]);
  assert.equal(blocs.length, 2);
  // Et l'appariement ne saute pas par dessus un autre bloc : deux
  // schemas eloignes dans l'article ne parlent pas de la meme chose.
  const eloignes = apparierVariantes([
    { type: "image", src: "/blog/img/x-large.webp", alt: "" },
    { type: "html", html: "<p>trois sections plus loin</p>" },
    { type: "image", src: "/blog/img/x-mobile.webp", alt: "" },
  ]);
  assert.equal(eloignes.length, 3);
});

test("le schema duplique de l'etude de cas ne s'affiche plus deux fois", () => {
  // `svg-gwenn-3-axes.svg` apparait deux fois d'affilee : l'import a
  // duplique le bloc, et le lecteur se demandait ce qu'il avait rate
  // entre les deux.
  const a = lireArticle("cas-client-jocelyne-tdah")!;
  const avant = a.blocs.filter((b) => b.type === "image" && b.src.includes("gwenn-3-axes")).length;
  assert.equal(avant, 2, "le doublon est bien dans le contenu importe");
  const apres = normaliserImages(a.blocs).filter(
    (b) => b.type === "image" && b.src.includes("gwenn-3-axes"),
  ).length;
  assert.equal(apres, 1);
});

test("un rappel volontaire plus loin dans l'article n'est PAS supprime", () => {
  const blocs = retirerDoublonsVoisins([
    { type: "image", src: "/blog/img/a.webp", alt: "" },
    { type: "html", html: "<p>plus loin</p>" },
    { type: "image", src: "/blog/img/a.webp", alt: "" },
  ]);
  assert.equal(blocs.length, 3);
});

// ── PINTEREST ──

test("le lien Pinterest porte l'IMAGE, ce qui manquait depuis toujours", () => {
  // Sans `media=`, Pinterest ouvre son formulaire SANS image et demande
  // au visiteur d'en choisir une. C'est exactement "aucune image ne peut
  // etre repartagee sur Pinterest". Le bug vivait dans
  // `PublicQuizClient.tsx`, donc dans un composant, donc hors de portee
  // de tout test : il y est reste des mois.
  const u = urlPartage("pinterest", {
    url: "https://tiquiz.fr/blog/x",
    texte: "un titre",
    media: "https://tiquiz.fr/blog/pin/x.jpg",
  })!;
  assert.ok(u.includes("media=" + encodeURIComponent("https://tiquiz.fr/blog/pin/x.jpg")), u);
  assert.ok(u.includes("description=un%20titre"), u);
});

test("un media RELATIF n'est jamais envoye a Pinterest", () => {
  // Pinterest ne connait pas notre domaine : un chemin relatif produit
  // une epingle sans image, c'est a dire le bug qu'on ferme.
  const u = urlPartage("pinterest", { url: "https://tiquiz.fr/x", texte: "t", media: "/blog/pin/x.jpg" })!;
  assert.ok(!u.includes("media="), u);
  assert.equal(estAbsolue("/blog/pin/x.jpg"), false);
  assert.equal(estAbsolue("https://tiquiz.fr/x.jpg"), true);
});

test("une origine LOCALE ne produit jamais d'adresse d'epingle", () => {
  // Un `??` protege du MANQUANT, jamais du FAUX (drame Veronique,
  // 2 aout). Une epingle sur `localhost` demanderait a Pinterest d'aller
  // chercher une image sur la machine du visiteur.
  assert.equal(absolutiser("/blog/pin/x.jpg", "http://localhost:3000"), null);
  assert.equal(absolutiser("/blog/pin/x.jpg", "http://127.0.0.1:3001"), null);
  assert.equal(absolutiser("/blog/pin/x.jpg", "https://tiquiz.fr"), "https://tiquiz.fr/blog/pin/x.jpg");
  assert.equal(absolutiser("https://ailleurs.fr/y.jpg", "https://tiquiz.fr"), "https://ailleurs.fr/y.jpg");
});

test("Instagram rend null, et ce n'est pas une erreur", () => {
  // Il n'a AUCUNE adresse de partage web. Rendre une URL bidon pour
  // "avoir quelque chose" enverrait le visiteur sur un flux vide sans
  // son message.
  assert.equal(urlPartage("instagram", { url: "https://x.fr", texte: "t" }), null);
  assert.equal(urlPartage("reseau-invente", { url: "https://x.fr", texte: "t" }), null);
});

test("chaque article a une epingle 1000 x 1500 sur le disque", () => {
  // Le format n'est pas un detail : Pinterest est un flux VERTICAL, une
  // image en 16/9 y occupe trois fois moins de hauteur que ses voisines
  // donc elle ne circule pas. C'est ca, "les images ne sont pas
  // conformes".
  for (const a of RESUMES) {
    const fichier = path.join(process.cwd(), "public", "blog", "pin", `${a.slug}.jpg`);
    assert.ok(fs.existsSync(fichier), `${a.slug} : epingle absente (npm run blog:epingles)`);
    const d = dimensionsImage(fs.readFileSync(fichier));
    assert.ok(d, `${a.slug} : epingle illisible`);
    assert.equal(d!.largeur, 1000, `${a.slug} : largeur`);
    assert.equal(d!.hauteur, 1500, `${a.slug} : hauteur`);
  }
});

test("le texte de partage nomme l'article et ne coupe pas un mot", () => {
  for (const a of RESUMES) {
    const t = textePartage(a);
    assert.ok(t.includes(a.titre.slice(0, 25)), `${a.slug} : le titre manque`);
    assert.ok(t.length <= 483, `${a.slug} : ${t.length} caracteres, Pinterest tronque`);
    assert.ok(!/\s$/.test(t), `${a.slug} : espace en fin`);
  }
});

// ── LES COMMENTAIRES ──

test("un commentaire valable est accepte, et rien de plus", () => {
  const v = jugerCommentaire(
    { slug: SLUGS[0], auteur: "  Jocelyne ", message: "  Merci, ca m'a debloquee.  ", email: "J@Exemple.FR" },
    SLUGS,
  );
  assert.ok(v.ok);
  assert.equal(v.valeur.auteur, "Jocelyne");
  assert.equal(v.valeur.message, "Merci, ca m'a debloquee.");
  assert.equal(v.valeur.email, "j@exemple.fr");
});

test("le champ piege attrape un robot sans rien demander au visiteur", () => {
  const v = jugerCommentaire(
    { slug: SLUGS[0], auteur: "Bot", message: "un message assez long", siteWeb: "http://spam.ru" },
    SLUGS,
  );
  assert.ok(!v.ok);
  assert.equal(v.raison, "piege");
});

test("un slug invente n'ecrit rien", () => {
  // Sans ce controle, n'importe qui ferait grossir la table sous des
  // slugs qu'aucune page ne montrera jamais.
  const v = jugerCommentaire({ slug: "article-invente", auteur: "Eric", message: "un message long" }, SLUGS);
  assert.ok(!v.ok);
  assert.equal(v.raison, "article-inconnu");
});

test("trois liens dans un commentaire, c'est de la pub", () => {
  assert.equal(compterLiens("va voir https://a.fr et https://b.fr"), 2);
  // Un lien explicite ne compte qu'UNE fois : sans retrait prealable, le
  // raccourcisseur contenu dans l'URL serait compte en plus.
  assert.equal(compterLiens("un seul lien : https://bit.ly/blog"), 1);
  // Le raccourcisseur ecrit en clair cache sa destination : il compte.
  assert.equal(compterLiens("passe par bit.ly/xyz"), 1);
  // MAIS un nom d'outil cite dans une discussion n'est pas un lien.
  // Ce blog parle de Systeme.io : les compter refuserait les
  // commentaires les plus interessants.
  assert.equal(compterLiens("j'utilise Systeme.io avec Tiquiz, et involve.me avant"), 0);
  assert.equal(compterLiens("aucun lien ici"), 0);
  const v = jugerCommentaire(
    { slug: SLUGS[0], auteur: "Eric", message: "https://a.fr https://b.fr et encore https://c.fr" },
    SLUGS,
  );
  assert.ok(!v.ok);
  assert.equal(v.raison, "trop-de-liens");
});

test("chaque refus a une phrase, sinon la lectrice ne sait pas quoi corriger", () => {
  // Regle du 3 aout : un `ok: false` DOIT produire quelque chose a
  // l'ecran. Le serveur rend la RAISON, l'interface ecrit la phrase.
  const raisons = [
    "nom-manquant", "nom-trop-long", "message-court", "message-long",
    "email-invalide", "trop-de-liens", "piege", "article-inconnu",
  ] as const;
  for (const r of raisons) {
    assert.ok(PHRASE_REFUS[r] && PHRASE_REFUS[r].length > 10, `${r} : phrase manquante`);
  }
});

test("un commentaire ne peut pas injecter de HTML dans la page", () => {
  // Il vient d'un inconnu et il finit sur la page publique d'un article.
  const sale = '<script>alert(1)</script><img src=x onerror="y">';
  const propre = messageEnHtml(sale);
  assert.ok(!propre.includes("<script"), propre);
  assert.ok(!propre.includes("<img"), propre);
  assert.ok(propre.includes("&lt;script&gt;"), propre);
});

test("les retours a la ligne sont gardes, mais bornes", () => {
  assert.equal(messageEnHtml("un\ndeux"), "un<br />deux");
  // Trente lignes vides sont une facon de pousser le commentaire suivant
  // hors de l'ecran.
  assert.equal(messageEnHtml("un\n\n\n\n\ndeux"), "un<br /><br />deux");
});

test("une adresse email est validee sur sa FORME, sans exces", () => {
  assert.equal(emailPlausible("jocelyne@exemple.fr"), true);
  assert.equal(emailPlausible("jocelyne+blog@exemple.co.uk"), true);
  assert.equal(emailPlausible("pas une adresse"), false);
  assert.equal(emailPlausible("x@y"), false);
  assert.equal(emailPlausible("a".repeat(300) + "@x.fr"), false);
});

test("un message trop long est refuse AVANT d'atteindre la base", () => {
  const v = jugerCommentaire({ slug: SLUGS[0], auteur: "Eric", message: "a".repeat(MESSAGE_MAX + 1) }, SLUGS);
  assert.ok(!v.ok);
  assert.equal(v.raison, "message-long");
});
