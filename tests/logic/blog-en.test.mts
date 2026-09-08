// tests/logic/blog-en.test.mts
//
// LES QUATRE ARTICLES ANGLAIS NE REPUBLIENT PAS CE QU'ON A CORRIGE EN
// FRANCAIS.
//
// Bene, 8 septembre 2026 : "on doit les recuperer sur le blog tiquiz.fr
// avec les articles et pages en anglais. Mais il faut que ce soit bien
// fait."
//
// -- CE QUE CE FILET TIENT, ET POURQUOI --------------------------------
//
// Ses quatre articles anglais viennent de `tipote.blog`, ecrits avant le
// 6 aout. Ils portent donc TOUT ce que le francais a paye les 31 aout et
// 1er septembre : l'ancien tarif, la vente beta a vie qui n'existe plus,
// "no threshold", "paid on the 10th", 40 % ecrit comme un plafond, et
// une section entiere sur Tipote qui n'est pas en vente.
//
// Les publier tels quels, ce serait republier en anglais exactement ce
// qu'on vient de corriger en francais, sur les deux pages qui vendent et
// qui recrutent les affilies.
//
// -- IL APPELLE LA MEME FONCTION QUE LE SCRIPT -------------------------
//
// C'est la mecanique de `blog.test.mts` depuis le 31 aout : le contenu
// est propre quand la reparation ne change plus rien. Un test qui
// relirait sa propre liste de chaines finirait par ne plus dire la meme
// chose que le script, et c'est le controle qui mentirait le premier.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";

import {
  FAITS_EN,
  INTERDITS_EN,
  LIENS_EN,
  ponctuationAnglaise,
  QUESTIONS_RETIREES_EN,
  retirerTirets,
  SECTION_TIPOTE,
  TEXTES_DE_LIEN_EN,
} from "@/lib/blog/faitsEn";

const DOSSIER = path.join(process.cwd(), "content", "blog", "en");

function articles(): { nom: string; brut: string; objet: any }[] {
  return fs
    .readdirSync(DOSSIER)
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .map((nom) => {
      const brut = fs.readFileSync(path.join(DOSSIER, nom), "utf8");
      return { nom, brut, objet: JSON.parse(brut) };
    });
}

test("les quatre articles anglais sont la, et ils s'apparient avec un article francais", () => {
  const tous = articles();
  assert.equal(tous.length, 4, "quatre articles anglais sont importes");
  for (const { nom, objet } of tous) {
    assert.equal(objet.langue, "en", `${nom} declare sa langue`);
    // L'APPARIEMENT EST ECRIT, JAMAIS DEVINE. Les slugs anglais ne
    // ressemblent pas aux francais ("create-quiz-systeme-io" contre
    // "comment-creer-quiz-systeme-io") : les rapprocher par
    // ressemblance donnerait un `hreflang` qui apparie deux articles
    // differents, et Google le croirait.
    assert.ok(objet.traductionDe, `${nom} dit de quel article francais il est la version`);
    assert.ok(
      fs.existsSync(path.join(process.cwd(), "content", "blog", `${objet.traductionDe}.json`)),
      `${nom} : l'article francais ${objet.traductionDe} existe`,
    );
  }
});

test("rien de ce qui a ete corrige en francais ne survit en anglais", () => {
  for (const { nom, brut } of articles()) {
    for (const i of INTERDITS_EN) {
      const m = brut.match(i.motif);
      assert.equal(m, null, `${nom} porte encore "${m?.[0]}" : ${i.pourquoi}`);
    }
  }
});

test("la reparation ne change plus rien : le contenu est deja d'aplomb", () => {
  // On rejoue exactement ce que le script applique a une chaine. S'il
  // reste quelque chose a corriger, c'est que le contenu deploye n'est
  // pas celui que la table produit.
  const corriger = (t: string): string => {
    let s = t.replace(/<a href="http:\/\/Systeme\.io"[^>]*>([\s\S]*?)<\/a>/g, (_, d) => d);
    for (const l of LIENS_EN) s = s.split(l.de).join(l.vers);
    for (const l of TEXTES_DE_LIEN_EN) s = s.split(l.de).join(l.vers);
    for (const f of FAITS_EN) s = s.split(f.de).join(f.vers);
    return ponctuationAnglaise(retirerTirets(s));
  };
  for (const { nom, objet } of articles()) {
    const champs: string[] = [objet.titre, objet.description, ...(objet.motsCles ?? [])];
    for (const b of objet.blocs) {
      if (b.type === "html") champs.push(b.html);
      else if (b.type === "titre") champs.push(b.texte);
      else if (b.type === "image") champs.push(b.alt ?? "");
      else if (b.type === "cta") champs.push(b.texte, b.url);
      else if (b.type === "faq")
        for (const q of b.questions) champs.push(q.question, q.reponse);
    }
    for (const c of champs) {
      assert.equal(corriger(c), c, `${nom} : la reparation change encore "${c.slice(0, 90)}"`);
    }
  }
});

test("la section sur Tipote est remplacee, pas laissee en place", () => {
  const rente = articles().find((a) => a.nom.startsWith("monthly-recurring"));
  assert.ok(rente, "l'article d'affiliation est la");
  const titres = rente.objet.blocs.filter((b: any) => b.type === "titre").map((b: any) => b.texte);
  assert.ok(
    !titres.includes(SECTION_TIPOTE.ouvre),
    "le titre qui ouvrait la section Tipote a disparu",
  );
  assert.ok(titres.includes(SECTION_TIPOTE.ferme), "la section suivante est toujours la");
  // Ce qui remplace parle de l'Atelier du Quiz, qui est VENDU.
  assert.ok(
    JSON.stringify(rente.objet).includes("Atelier du Quiz"),
    "le remplacement parle de l'Atelier du Quiz, pas d'un produit qui n'est pas en vente",
  );
});

test("les questions de FAQ retirees ne reviennent pas", () => {
  const toutes = new Set<string>();
  for (const { objet } of articles())
    for (const b of objet.blocs)
      if (b.type === "faq") for (const q of b.questions) toutes.add(q.question);
  for (const r of QUESTIONS_RETIREES_EN) {
    assert.ok(!toutes.has(r.question), `la question retiree est revenue : ${r.pourquoi}`);
  }
});

test("la ponctuation est ANGLAISE, pas francaise", () => {
  // Bene, 8 septembre : "il faut a chaque fois utiliser le champ
  // semantique, les expressions, tournures de phrases, ponctuation etc
  // .. propre a chaque langue, c'est pas uniquement du mot a mot."
  //
  // MESURE avant d'ecrire la regle : son anglais ecrit "40%" et "$9",
  // jamais "40 %" ni "9 USD". Les 27 espaces devant un pourcentage
  // etaient les MIENS, poses par la table de corrections.
  for (const { nom, brut } of articles()) {
    const pct = brut.match(/[0-9}][  ]%/g) ?? [];
    assert.equal(pct.length, 0, `${nom} : ${pct.length} espace(s) devant un %`);
    const pon = brut.match(/[A-Za-z0-9][  ][:;!?]/g) ?? [];
    assert.equal(pon.length, 0, `${nom} : ${pon.length} espace(s) devant une ponctuation`);
    assert.equal((brut.match(/[0-9] EUR/g) ?? []).length, 0, `${nom} : un montant ecrit "N EUR"`);
    assert.equal((brut.match(/[—–]/g) ?? []).length, 0, `${nom} : un tiret cadratin`);
  }
});

test("ponctuationAnglaise ne touche a rien de technique, et elle est un point fixe", () => {
  // RETIRER une espace est aussi dangereux que d'en inserer (lecon du
  // 3 aout) : ces six chaines ne doivent pas bouger d'un caractere.
  for (const t of [
    "https://tiquiz.fr/signup",
    '<span style="color:red">x</span>',
    "12:30",
    "&nbsp;",
    "a?b=1",
    "Read this: it works",
  ]) {
    assert.equal(ponctuationAnglaise(t), t, `intouchable : ${t}`);
  }
  assert.equal(ponctuationAnglaise("And now ?"), "And now?");
  assert.equal(ponctuationAnglaise("three options : yes"), "three options: yes");
  // IDEMPOTENTE : sans ca le texte derive un peu plus a chaque passage,
  // et personne ne le voit avant que ce soit illisible.
  const une = ponctuationAnglaise("And now ? three options : yes");
  assert.equal(ponctuationAnglaise(une), une);
});

test("aucun prix de concurrent n'est recopie a la main", () => {
  // Les montants Typeform et Zapier viennent de `liensIntegrations.ts`,
  // la MEME source que le francais depuis le 1er septembre. Son anglais
  // annonçait "$59/month" et "$88/month", perimes : un chiffre recopie
  // est un chiffre faux au prochain changement, et il vit ici a
  // l'endroit exact ou un lecteur va verifier.
  const src = fs.readFileSync(path.join(process.cwd(), "lib", "blog", "faitsEn.ts"), "utf8");
  const sansCommentaires = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
  const vers = [...sansCommentaires.matchAll(/vers:\s*(`[\s\S]*?`|"[^"]*")/g)].map((m) => m[1]);
  for (const v of vers) {
    const m = v.match(/\$\d[\d.,]*\s*\/?\s*month/);
    assert.equal(m, null, `un prix mensuel est ecrit a la main : ${m?.[0]}`);
  }
  assert.ok(
    sansCommentaires.includes("TYPEFORM_PLUS_PAR_MOIS_USD") &&
      sansCommentaires.includes("ZAPIER_PRO_PAR_MOIS_USD"),
    "les deux prix sont LUS dans liensIntegrations.ts",
  );
});

test("chaque image anglaise est chez nous, et aucune ne manque", () => {
  const refs = new Set<string>();
  for (const { objet } of articles()) {
    if (objet.couverture) refs.add(objet.couverture);
    for (const b of objet.blocs)
      if (b.type === "image") {
        refs.add(b.src);
        if (b.mobile) refs.add(b.mobile);
      }
  }
  for (const r of refs) {
    // Hotlinker le CDN de Systeme.io tuerait tous les visuels le jour de
    // la resiliation (regle du 29 aout).
    assert.ok(r.startsWith("/blog/img/"), `image servie par nous : ${r}`);
    assert.ok(
      fs.existsSync(path.join(process.cwd(), "public", r)),
      `l'image existe sur le disque : ${r}`,
    );
  }
});
