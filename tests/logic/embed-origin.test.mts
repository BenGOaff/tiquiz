// tests/logic/embed-origin.test.mts
//
// Béné, 6 août 2026 : "problème sur la vidéo démo popquiz de ma page de
// vente donc un truc a été cassé". À la place du lecteur, la page de
// vente de Tiquiz affichait, en clair et en police à chasse fixe :
//
//   Unknown hostname
//
// Rien n'était cassé côté code, et le serveur vidéo répondait
// parfaitement. Le code d'intégration collé sur Systeme.io pointait
// vers `https://test.ethilife.fr/embed/p/<id>`, le domaine PERSONNALISÉ
// qui était sélectionné dans l'onglet Partage le jour où le code avait
// été copié. Ce domaine n'est plus vérifié dans `custom_domains`, donc
// le répartiteur (infra/dispatcher) répond 404 "Unknown hostname", et
// Caddy renvoie ce texte au visiteur.
//
// Le certificat, lui, existait encore : le navigateur n'a rien signalé,
// il a simplement affiché la page d'erreur du répartiteur. C'est ce qui
// rend la panne si trompeuse.
//
// LA LEÇON : l'hôte de l'iframe n'est JAMAIS vu par le visiteur (le
// commentaire du code le disait déjà). Le poser sur un domaine
// personnalisé n'apporte donc rien, et coûte un point de panne sur des
// pages qu'on ne contrôle pas, chez des créatrices qu'on ne pourra pas
// prévenir. Le code d'intégration prend le domaine PRINCIPAL, le seul
// qui ne peut pas expirer.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lire = (f: string) => readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");

/** Tous les écrans qui fabriquent un code d'intégration. */
const ECRANS = [
  "app/popquiz/[popquizId]/PopquizEditClient.tsx",
  "app/popquiz/new/PopquizNewClient.tsx",
  "app/popquizzes/PopquizzesClient.tsx",
  "app/quizzes/QuizzesClient.tsx",
];

test("aucun ecran ne construit l'iframe sur le domaine de partage", () => {
  // C'est la faute exacte du 6 aout. Un seul ecran qui la refait suffit
  // a rendre des pages de vente muettes, et on ne le saura que par la
  // creatrice.
  for (const f of ECRANS) {
    const src = lire(f);
    for (const m of src.matchAll(/`\$\{([A-Za-z]+)\}\/embed\/p\//g)) {
      assert.equal(m[1], "embedOrigin", `${f} : construit l'iframe sur \`${m[1]}\``);
    }
  }
});

test("chaque ecran qui integre lit bien embedOrigin", () => {
  // Sans le garde-fou ci-dessus, un ecran pourrait passer le test
  // simplement en n'ayant plus de code d'integration du tout.
  let vus = 0;
  for (const f of ECRANS) {
    const src = lire(f);
    if (!src.includes("/embed/p/")) continue;
    vus++;
    assert.match(src, /embedOrigin/, f);
    assert.match(src, /useShareDomain\(\)/, f);
  }
  assert.equal(vus, ECRANS.length, "les quatre ecrans doivent fabriquer un code d'integration");
});

test("embedOrigin part du domaine principal, jamais du domaine choisi", () => {
  const hook = lire("hooks/useShareDomain.ts");
  const i = hook.indexOf("const embedOrigin =");
  assert.ok(i > 0, "embedOrigin doit exister");
  const bloc = hook.slice(i, i + 260);
  assert.match(bloc, /mainHost/);
  // Le repli est l'origine de navigation (le tableau de bord, donc deja
  // le domaine principal). Retomber sur shareOrigin reprendrait le
  // domaine personnalise, donc remettrait le bug.
  assert.doesNotMatch(bloc, /shareOrigin/);
  assert.match(bloc, /window\.location\.origin/);
});

test("le lien PUBLIC garde le domaine personnalise", () => {
  // La correction ne doit pas deborder : le lien que la creatrice
  // partage a ses visiteurs, lui, doit rester sur SA marque. C'est
  // toute la raison d'etre des domaines personnalises.
  const hook = lire("hooks/useShareDomain.ts");
  const i = hook.indexOf("const buildPublicUrl");
  assert.ok(i > 0);
  assert.match(hook.slice(i, i + 400), /shareOrigin/);
});
