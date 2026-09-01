// tests/logic/liens-site-page-vente.test.mts
//
// LA PAGE D'ACCUEIL DE TIQUIZ.FR NE RECOMMANDE PLUS SA PROPRE COPIE.
//
// 1er septembre 2026 : sur toute la page d'accueil, QUATRE liens
// menaient à `tiquiz.fr`, les quatre boutons de commande. Tout le reste
// partait chez `www.tipote.fr` : les cinq liens légaux, l'affiliation,
// l'Atelier, le logo, et `www.tipote.fr/tiquiz`, c'est à dire la copie
// mot pour mot de la page qu'on était en train de lire.
//
// Ce dernier est le plus cher : depuis la page qui doit remplacer
// l'ancienne, un lien vers l'ancienne la désigne comme celle qui fait
// autorité.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  SALES_CHECKOUT_TARGETS,
  SALES_LINKS_LEFT_ALONE,
  SALES_SITE_LINKS,
  rewriteSiteLinks,
} from "@/lib/sales/salesPageLinks";
import { renderSalesPage } from "@/lib/sales/servePage";

const CAPTURE = path.join(process.cwd(), "content", "sales", "tiquiz.html");

function rendu(publique: boolean): string {
  return renderSalesPage(
    fs.readFileSync(CAPTURE, "utf8"),
    {
      slug: "tiquiz",
      canonical: "https://tiquiz.fr/",
      title: "Tiquiz",
      description: "Description.",
      locale: "fr_FR",
    },
    {
      indexable: publique,
      analytics: false,
      checkoutTargets: SALES_CHECKOUT_TARGETS.tiquiz,
      siteLinks: publique ? SALES_SITE_LINKS.tiquiz : null,
    },
  );
}

function liens(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
}

test("sur le domaine public, la page ne pointe plus vers sa propre copie", () => {
  const versLaCopie = liens(rendu(true)).filter((h) =>
    /^https?:\/\/(www\.)?tipote\.fr\/tiquiz\/?(\?|$)/i.test(h),
  );
  assert.deepEqual(versLaCopie, []);
});

test("les liens legaux menent a NOS routes, pas a celles de Systeme.io", () => {
  // LE PIÈGE QUE CE TEST FERME. Les chemins de Systeme.io
  // (`/mentions-legales`, `/cgv`, `/cgu`,
  // `/politique-de-confidentialite`, `/politique-de-cookies`) n'existent
  // PAS chez nous. Les recopier tels quels aurait posé cinq 404 dans le
  // pied de page de la page qui vend, c'est à dire le drame du centre
  // d'aide du 24 août : un 404 depuis l'endroit où on demande de faire
  // confiance.
  const tous = liens(rendu(true));
  const NOS_PAGES = ["/legal", "/terms", "/terms-of-use", "/privacy", "/cookies", "/affiliation"];
  for (const chemin of NOS_PAGES) {
    assert.ok(tous.includes(chemin), `le pied de page doit mener à ${chemin}`);
    assert.ok(
      fs.existsSync(path.join(process.cwd(), "app", chemin.slice(1))) ||
        fs.existsSync(path.join(process.cwd(), "app", "(site)", chemin.slice(1))),
      `${chemin} n'existe pas dans app/ : le pied de page mène à un 404`,
    );
  }
  assert.ok(tous.includes("https://atelierduquiz.fr/"), "l'Atelier a son propre domaine");

  for (const ancien of Object.keys(SALES_SITE_LINKS.tiquiz)) {
    assert.equal(
      tous.some((h) => h.toLowerCase() === ancien.toLowerCase()),
      false,
      `${ancien} traîne encore dans la page`,
    );
  }
});

test("l'optin gratuit et les tunnels a part restent chez Systeme.io", () => {
  // Ce ne sont PAS des oublis : l'inscription gratuite est le seul
  // événement qui porte une URL de tunnel, donc le seul qui sait d'où
  // vient l'inscrit. Ce test existe pour qu'on ne la "corrige" pas par
  // symétrie un jour de ménage.
  const tous = liens(rendu(true));
  for (const garde of SALES_LINKS_LEFT_ALONE) {
    if (/\/tiquiz\/?$/i.test(garde)) continue; // celui là revient chez nous
    assert.ok(tous.includes(garde), `${garde} doit rester tel quel`);
  }
});

test("derriere la cle d'apercu, on ne touche a aucun lien de site", () => {
  // La page est alors un chantier, pas le site : son pied de page doit
  // continuer de désigner ce qui est en ligne.
  const tous = liens(rendu(false));
  assert.ok(tous.includes("https://www.tipote.fr/mentions-legales"));
  assert.equal(tous.includes("/legal"), false);
});

test("ce qui suit le ? est conserve", () => {
  const { html } = rewriteSiteLinks(`<a href="https://www.tipote.fr/affiliation?ref=gwenn">x</a>`, {
    "https://www.tipote.fr/affiliation": "/affiliation",
  });
  assert.ok(html.includes(`href="/affiliation?ref=gwenn"`));
});

test("une adresse absente de la liste n'est pas touchee", () => {
  const { html } = rewriteSiteLinks(`<a href="https://www.tipote.fr/autre-chose">x</a>`, {
    "https://www.tipote.fr/affiliation": "/affiliation",
  });
  assert.ok(html.includes("https://www.tipote.fr/autre-chose"));
});

test("un lien ecrit DANS un bloc de texte est reecrit lui aussi", () => {
  // Mesuré sur la capture : trois liens vers l'Atelier vivent dans le
  // modèle JSON de la page, sous la forme `href=\"...\"`. Ne traiter que
  // les `href="..."` nus en laissait trois derrière, et ce sont ceux que
  // l'éditeur relit pour reconstruire le bloc.
  const { html } = rewriteSiteLinks(
    String.raw`{"html":"<a href=\"https://www.tipote.fr/cgv\">CGV</a>"}`,
    { "https://www.tipote.fr/cgv": "/terms" },
  );
  assert.ok(html.includes(String.raw`href=\"/terms\"`), html);
  assert.equal(html.includes("tipote.fr/cgv"), false);
});
