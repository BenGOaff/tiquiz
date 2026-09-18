// tests/logic/trafic-cloudflare.test.mts
//
// « MON TRAFIC N'EST ABSOLUMENT PAS TRACKÉ » (Béné, 18 septembre 2026)
//
// L'écran de pilotage affichait "0 vue" à côté de "8 ventes encaissées",
// et Google Search Console, lui, voyait 7 clics et 78 impressions.
//
// La cause, mesurée le jour même sur la production :
//
//   curl -sS -o /dev/null -D - https://tiquiz.fr/ -H "accept: text/html"
//   -> cache-control: max-age=300
//   -> cf-cache-status: HIT      age: 9
//
// Cloudflare répond à la place du serveur. Le middleware ne tourne pas.
// La vue n'existe nulle part. Onze jours.
//
// Ce fichier tient les deux garde-fous du correctif : le compteur vit
// dans le navigateur, et l'écran n'a plus le droit d'afficher un zéro
// qu'il ne peut pas défendre.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { coherenceTrafic, phraseCoherence } from "../../lib/trafic/coherenceTrafic.ts";
import { vueNavigateurASignaler } from "../../lib/trafic/vueNavigateur.ts";

const NOS_HOTES = { "tiquiz.fr": "tiquiz", "www.tiquiz.fr": "tiquiz" } as const;
const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

function lire(chemin: string): string {
  return readFileSync(new URL(`../../${chemin}`, import.meta.url), "utf8");
}

// ------------------------------------------------ ce qui compte, ou pas

test("un vrai visiteur sur une de nos pages compte", () => {
  const v = vueNavigateurASignaler({
    hote: "tiquiz.fr",
    chemin: "/blog/avis-tiquiz",
    secFetchSite: "same-origin",
    origin: null,
    userAgent: CHROME,
    hotesConnus: NOS_HOTES,
  });
  assert.deepEqual(v, { compte: true, hote: "tiquiz.fr", chemin: "/blog/avis-tiquiz" });
});

test("le port ne change pas l'hôte, et la casse non plus", () => {
  const v = vueNavigateurASignaler({
    hote: "TIQUIZ.FR:443",
    chemin: "/",
    secFetchSite: "same-origin",
    origin: null,
    userAgent: CHROME,
    hotesConnus: NOS_HOTES,
  });
  assert.equal(v.compte && v.hote, "tiquiz.fr");
});

test("un hôte qui n'est pas à nous ne compte pas", () => {
  const v = vueNavigateurASignaler({
    hote: "quiz.tipote.com",
    chemin: "/dashboard",
    secFetchSite: "same-origin",
    origin: null,
    userAgent: CHROME,
    hotesConnus: NOS_HOTES,
  });
  assert.deepEqual(v, { compte: false, raison: "hote_inconnu" });
});

test("une page TIERCE qui appellerait notre adresse ne compte pas", () => {
  for (const site of ["cross-site", "same-site", "none"]) {
    const v = vueNavigateurASignaler({
      hote: "tiquiz.fr",
      chemin: "/",
      secFetchSite: site,
      // Son `origin` la désigne, elle, et pas nous.
      origin: "https://un-site-tiers.example",
      userAgent: CHROME,
      hotesConnus: NOS_HOTES,
    });
    assert.deepEqual(v, { compte: false, raison: "hors_site" }, site);
  }
});

test("SAFARI ANCIEN COMPTE QUAND MÊME, et c'est une faute que j'ai faite", () => {
  // Mon premier jet n'acceptait que `sec-fetch-site`. Safari ne le pose
  // que depuis la version 16.4 : tous les visiteurs d'un iPhone un peu
  // ancien auraient été refusés en silence, et le compteur aurait
  // recommencé à sous compter. C'est le défaut qu'on répare.
  //
  // Un POST porte TOUJOURS `origin`, même same-origin, dans tous les
  // navigateurs. C'est la deuxième preuve.
  const v = vueNavigateurASignaler({
    hote: "tiquiz.fr",
    chemin: "/tarifs",
    secFetchSite: null,
    origin: "https://tiquiz.fr",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 Version/15.6 Mobile Safari/604.1",
    hotesConnus: NOS_HOTES,
  });
  assert.deepEqual(v, { compte: true, hote: "tiquiz.fr", chemin: "/tarifs" });
});

test("un `origin` qui n'est pas le nôtre ne vaut pas preuve", () => {
  for (const origin of ["https://tiquiz.fr.attaquant.example", "pas-une-url", "https://www.tiquiz.fr"]) {
    const v = vueNavigateurASignaler({
      hote: "tiquiz.fr",
      chemin: "/",
      secFetchSite: null,
      origin,
      userAgent: CHROME,
      hotesConnus: NOS_HOTES,
    });
    assert.deepEqual(v, { compte: false, raison: "hors_site" }, origin);
  }
});

test("les DEUX preuves absentes : refusé, jamais toléré", () => {
  // Le sens du repli : une vue ratée est une ligne en moins, une vue
  // inventée est une décision prise sur un chiffre faux.
  for (const absent of [null, undefined, ""]) {
    const v = vueNavigateurASignaler({
      hote: "tiquiz.fr",
      chemin: "/",
      secFetchSite: absent,
      origin: absent,
      userAgent: CHROME,
      hotesConnus: NOS_HOTES,
    });
    assert.equal(v.compte, false);
  }
});

test("un robot ne compte pas, même bien élevé", () => {
  for (const ua of ["Googlebot/2.1", "curl/8.4.0", "python-requests/2.31", ""]) {
    const v = vueNavigateurASignaler({
      hote: "tiquiz.fr",
      chemin: "/",
      secFetchSite: "same-origin",
      origin: null,
      userAgent: ua,
      hotesConnus: NOS_HOTES,
    });
    assert.equal(v.compte, false, ua || "(agent vide)");
  }
});

test("un fichier n'est pas une page, une URL complète non plus", () => {
  for (const chemin of ["/logo.png", "/sitemap.xml", "https://tiquiz.fr/", "", "blog"]) {
    const v = vueNavigateurASignaler({
      hote: "tiquiz.fr",
      chemin,
      secFetchSite: "same-origin",
      origin: null,
      userAgent: CHROME,
      hotesConnus: NOS_HOTES,
    });
    assert.deepEqual(v, { compte: false, raison: "chemin_invalide" }, chemin || "(vide)");
  }
});

test("le chemin est normalisé par le MÊME module que l'ancien compteur", () => {
  // Sinon deux périodes du même tableau ne parlent pas de la même page.
  const v = vueNavigateurASignaler({
    hote: "tiquiz.fr",
    chemin: "/Blog/Avis-Tiquiz/",
    secFetchSite: "same-origin",
    origin: null,
    userAgent: CHROME,
    hotesConnus: NOS_HOTES,
  });
  assert.equal(v.compte && v.chemin, "/blog/avis-tiquiz");
});

test("une page anglaise garde son préfixe : c'est une page à part", () => {
  const v = vueNavigateurASignaler({
    hote: "tiquiz.fr",
    chemin: "/en/tarifs",
    secFetchSite: "same-origin",
    origin: null,
    userAgent: CHROME,
    hotesConnus: NOS_HOTES,
  });
  assert.equal(v.compte && v.chemin, "/en/tarifs");
});

// ------------------------------------- l'écran n'a plus le droit de mentir

test("des ventes et zéro vue : la MESURE est cassée, et on le dit", () => {
  // C'est exactement l'écran du 18 septembre.
  const v = coherenceTrafic({ vues: 0, ventes: 8 });
  assert.deepEqual(v, { etat: "mesure_cassee", ventes: 8 });
  const phrase = phraseCoherence(v);
  assert.ok(phrase && phrase.includes("8 ventes encaissées"));
  assert.ok(phrase && phrase.includes("MESURE"), "le mot doit y être : ce n'est pas le trafic");
});

test("une seule vente s'accorde au singulier", () => {
  const phrase = phraseCoherence(coherenceTrafic({ vues: 0, ventes: 1 }));
  assert.ok(phrase && phrase.includes("1 vente encaissée"));
  assert.ok(phrase && !phrase.includes("ventes"), "pas de 'ventes' au pluriel pour une seule");
});

test("zéro vue ET zéro vente ne fait pas rougir l'écran", () => {
  // Un garde-fou qui crie pour rien finit ignoré (leçon du 24 août).
  assert.deepEqual(coherenceTrafic({ vues: 0, ventes: 0 }), { etat: "rien_encore" });
  assert.equal(phraseCoherence(coherenceTrafic({ vues: 0, ventes: 0 })), null);
});

test("dès qu'une vue est mesurée, l'écran se tait", () => {
  assert.deepEqual(coherenceTrafic({ vues: 1, ventes: 8 }), { etat: "coherent" });
  assert.equal(phraseCoherence(coherenceTrafic({ vues: 1, ventes: 8 })), null);
});

test("un NaN ne traverse pas le garde-fou", () => {
  // Un `??` protège du MANQUANT, jamais du FAUX : `NaN > 0` est faux,
  // donc un NaN passerait pour un zéro sans que rien ne le dise.
  assert.deepEqual(coherenceTrafic({ vues: Number.NaN, ventes: 3 }), {
    etat: "mesure_cassee",
    ventes: 3,
  });
  assert.deepEqual(coherenceTrafic({ vues: 5, ventes: Number.NaN }), { etat: "coherent" });
  assert.deepEqual(coherenceTrafic({ vues: Number.NaN, ventes: Number.NaN }), {
    etat: "rien_encore",
  });
});

// ------------------------------------------------- là où vit la mécanique

test("la balise est posée à la RACINE, pas page par page", () => {
  // Le bon de commande n'est pas sous `SiteShell` : c'est justement sa
  // vue qui manquait ("vues d'un bon de commande : 0" à côté de 8
  // ventes). Une balise page par page est une balise qu'on oublie.
  const layout = lire("app/layout.tsx");
  assert.ok(layout.includes("<CompteurDeVue />"), "la balise vit dans le cadre racine");
});

test("la balise refuse d'elle même un hôte qui n'est pas public", () => {
  const src = lire("components/site/CompteurDeVue.tsx");
  assert.ok(src.includes("SALES_HOSTS"), "le garde est sur l'HÔTE");
  assert.ok(src.includes("keepalive"), "la vue d'un visiteur qui repart aussitôt ne se perd pas");
  // Aucun identifiant, aucun cookie : c'est ce qui dispense de
  // consentement, donc ce qui fait voir aussi ceux qui refusent le
  // bandeau.
  assert.ok(!src.includes("document.cookie"), "aucun cookie n'est lu ni posé");
  assert.ok(src.includes('credentials: "omit"'), "aucun cookie n'est envoyé non plus");
});

test("l'adresse ne porte aucun des mots que les bloqueurs reconnaissent", () => {
  const src = lire("components/site/CompteurDeVue.tsx");
  const adresse = /fetch\("([^"]+)"/.exec(src)?.[1] ?? "";
  assert.ok(adresse.startsWith("/"), "première partie, donc pas un domaine tiers");
  for (const mot of ["track", "analytic", "collect", "pixel", "beacon", "stat"]) {
    assert.ok(!adresse.includes(mot), `"${mot}" est dans les listes de blocage`);
  }
});

test("le bandeau d'alerte est branché sur LES DEUX sites", () => {
  // Un garde-fou qui ne protège qu'un des deux jumeaux ne protège
  // personne (leçon des deux versions de `pdf-parse`, 7 août). Le bloc
  // de l'Atelier affichait le même zéro, pour exactement la même raison.
  const src = lire("components/pilotage/TraficPilotage.tsx");
  const occurrences = src.split("<AlerteMesure ").length - 1;
  assert.equal(occurrences, 2, "tiquiz.fr ET atelierduquiz.fr");
  // Il lit les ventes DU SITE, jamais le total des deux : sinon il se
  // tairait sur l'Atelier dès qu'une vente Tiquiz existe.
  assert.ok(
    src.includes("<AlerteMesure vues={entonnoir.vues} ventes={entonnoir.ventes} />"),
    "tiquiz.fr compare avec SES ventes",
  );
  assert.ok(
    src.includes("<AlerteMesure vues={e.vues} ventes={e.ventes} />"),
    "l'Atelier compare avec SES ventes",
  );
});

test("l'écran ne promet plus de voir les bloqueurs", () => {
  // Il le promettait, et c'était vrai tant que le comptage se faisait
  // côté serveur. Depuis qu'il se fait dans le navigateur, c'est faux :
  // une promesse périmée dans un tableau de bord est un mensonge.
  const src = lire("components/pilotage/TraficPilotage.tsx");
  assert.ok(
    !/voit aussi les gens qui refusent le\s+bandeau cookies et ceux qui ont un bloqueur/.test(src),
    "la phrase d'avant promettait les bloqueurs",
  );
  assert.ok(src.includes("bloqueur"), "mais elle doit toujours PARLER des bloqueurs");
  assert.ok(src.includes("plancher"), "et dire que le chiffre est un plancher");
});
