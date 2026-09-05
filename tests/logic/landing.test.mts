// tests/logic/landing.test.mts
//
// LA LANDING NE RECOPIE AUCUN PRIX NI AUCUNE FONCTIONNALITÉ.
//
// Béné, 4 septembre 2026 : "putain mais tu les as les fonctionnalités
// pour les tarifs : sur la page de vente, et puis dans le code !!"
//
// Elle avait raison. Le bloc tarifs de la landing n'affichait aucune
// fonctionnalité, et j'avais annoncé que c'était parce que je ne savais
// pas ce que le gratuit ouvre. `lib/checkout/avantages.ts` est LA source
// depuis le 2 septembre, et `FREE_LIMITS` porte les limites du gratuit :
// il n'y avait rien à demander, seulement à lire.
//
// Ce que ce filet tient, dans l'ordre d'importance :
//
//   1. les prix viennent de `OWNER_CATALOG`, jamais écrits dans le module ;
//   2. les lignes viennent de `avantages.ts`, jamais réécrites ;
//   3. les limites du gratuit viennent de `FREE_LIMITS`, et TOUS les
//      trous sont bouchés (le bug du 4 septembre : `replace` avec une
//      chaîne ne remplace que la première occurrence, donc l'écran
//      affichait "1 quiz et {quiz} sondage" alors que `tsc` était vert) ;
//   4. aucune langue écrite ne laisse un champ à trou.

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  AVIS,
  LANDING,
  TRUSTPILOT_URL,
  avantagesPartages,
  colonnesDeTarif,
  contenuLanding,
} from "@/lib/site/landing";
import {
  AVANTAGES_COMMUNS,
  AVANTAGES_NOUVEAUX,
  AVANTAGES_PAYANTS,
  AVANTAGES_PLUS,
} from "@/lib/checkout/avantages";
import { OWNER_CATALOG, formatOwnerPrice } from "@/lib/checkout/catalog";
import { FREE_LIMITS } from "@/lib/planLimits";

import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(join(process.cwd(), "lib/site/landing.ts"), "utf8");
/** Le module SANS ses commentaires : sinon un contrôle tombe sur sa propre explication. */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

describe("la landing lit les tarifs, elle ne les recopie pas", () => {
  test("aucun prix n'est écrit dans le module", () => {
    for (const id of ["mensuel", "annuel", "mensuel-plus", "annuel-plus"] as const) {
      const euros = String(Math.round(OWNER_CATALOG[id].amountCents / 100));
      assert.ok(
        !new RegExp(`["'\`][^"'\`]*\\b${euros}\\s*€`).test(CODE),
        `le prix ${euros} € est écrit en dur dans lib/site/landing.ts`,
      );
    }
  });

  test("les trois colonnes portent les prix du catalogue", () => {
    const c = colonnesDeTarif(LANDING.fr);
    assert.equal(c.length, 3);
    assert.equal(c[1].prix, formatOwnerPrice(OWNER_CATALOG["mensuel"]));
    assert.ok(c[1].prixAn?.includes(formatOwnerPrice(OWNER_CATALOG["annuel"])));
    assert.equal(c[2].prix, formatOwnerPrice(OWNER_CATALOG["mensuel-plus"]));
    assert.ok(c[2].prixAn?.includes(formatOwnerPrice(OWNER_CATALOG["annuel-plus"])));
    // Le gratuit n'est pas au catalogue : il n'a pas de prix annuel.
    assert.equal(c[0].prixAn, null);
  });

  test("les fonctionnalités viennent de avantages.ts, au mot près", () => {
    const c = colonnesDeTarif(LANDING.fr);
    assert.deepEqual([...c[1].lignes], AVANTAGES_PAYANTS.map((a) => a.texte));
    assert.deepEqual([...c[2].lignes], AVANTAGES_PLUS.map((a) => a.texte));
    assert.deepEqual(
      [...avantagesPartages()],
      [...AVANTAGES_COMMUNS, ...AVANTAGES_NOUVEAUX].map((a) => a.texte),
    );
  });

  test("les limites du gratuit viennent de FREE_LIMITS", () => {
    for (const langue of Object.keys(LANDING)) {
      const lignes = colonnesDeTarif(LANDING[langue])[0].lignes.join(" | ");
      assert.ok(
        lignes.includes(String(FREE_LIMITS.maxQuizzesPerMode)),
        `${langue} : la limite de quiz n'apparaît pas`,
      );
      assert.ok(
        lignes.includes(String(FREE_LIMITS.visibleLeadsPerMonth)),
        `${langue} : la limite de réponses visibles n'apparaît pas`,
      );
    }
  });

  test("AUCUN champ à trou ne sort à l'écran", () => {
    // Le bug du 4 septembre : `replace("{quiz}", …)` ne remplaçait que
    // la première occurrence, et la ligne en portait deux. `tsc` était
    // vert, l'écran affichait "1 quiz et {quiz} sondage".
    for (const langue of Object.keys(LANDING)) {
      const t = LANDING[langue];
      const rendu = [
        ...colonnesDeTarif(t).flatMap((c) => [c.nom, c.prix, c.cadence, c.prixAn ?? "", ...c.lignes]),
        ...avantagesPartages(),
      ].join(" | ");
      assert.ok(
        !/[{][a-z]+[}]/.test(rendu),
        `${langue} : un champ à trou reste affiché -> ${rendu.match(/[{][a-z]+[}]/g)?.join(", ")}`,
      );
    }
  });
});

describe("les langues écrites", () => {
  test("une langue inconnue retombe sur l'anglais, jamais sur le français", () => {
    assert.equal(contenuLanding("de").langue, "en");
    assert.equal(contenuLanding(null).langue, "en");
    assert.equal(contenuLanding("fr").langue, "fr");
    // Une variante régionale retombe sur sa langue de base.
    assert.equal(contenuLanding("en-GB").langue, "en");
  });

  test("aucun tiret cadratin dans le texte affiché", () => {
    for (const langue of Object.keys(LANDING)) {
      const t = LANDING[langue];
      const tout = JSON.stringify(t);
      assert.ok(
        !/[—–]/.test(tout),
        `${langue} : tiret cadratin ou demi-cadratin dans le texte de la landing`,
      );
    }
  });
});

describe("les avis sont ceux de Trustpilot, et rien d'autre", () => {
  // Bene, 4 septembre 2026 : "on a ici des avis tous frais sur tiquiz,
  // tu peux les utiliser : fr.trustpilot.com/review/tiquiz.fr".
  //
  // Un faux temoignage est son interdit numero un. Ce filet ne peut pas
  // aller verifier Trustpilot, donc il tient ce qu'il PEUT tenir : les
  // avis ne vivent pas dans les objets de langue (donc ils ne se
  // traduisent jamais), chacun porte son auteur ET sa date, et le lien
  // vers la fiche publique reste affiche pour que n'importe qui verifie.

  test("aucun avis ne vit dans un objet de langue", () => {
    for (const langue of Object.keys(LANDING)) {
      const tout = JSON.stringify(LANDING[langue]);
      for (const a of AVIS) {
        assert.ok(
          !tout.includes(a.texte.slice(0, 40)),
          `${langue} : le texte de ${a.auteur} a ete recopie dans une langue, donc il sera traduit`,
        );
      }
    }
  });

  test("chaque avis porte son auteur et sa date", () => {
    assert.ok(AVIS.length >= 3, "au moins trois avis, sinon la section ne pese rien");
    for (const a of AVIS) {
      assert.ok(a.auteur.trim().length > 1, "un avis sans auteur n'est pas un temoignage");
      assert.match(a.date, /\d{4}/, `${a.auteur} : la date doit etre affichable`);
      assert.ok(a.texte.trim().length > 40, `${a.auteur} : le texte est trop court pour etre l'avis`);
    }
  });

  test("le lien vers la fiche publique pointe bien sur Trustpilot", () => {
    assert.match(TRUSTPILOT_URL, /^https:\/\/(fr\.)?trustpilot\.com\/review\/tiquiz\.fr$/);
  });

  test("AUCUNE note chiffree n'est annoncee", () => {
    // Trustpilot affiche 100 % de 5 etoiles ET un TrustScore pondere de
    // 4,2. Les deux cote a cote se liraient comme une erreur : la page
    // dit le FAIT ("tous en 5 etoiles") et met le lien.
    for (const langue of Object.keys(LANDING)) {
      const preuve = LANDING[langue].preuve;
      assert.ok(
        !/\d[,.]\d\s*\/\s*5|\d[,.]\d\s*sur\s*5/i.test(preuve),
        `${langue} : la barre de preuve annonce une note chiffree -> ${preuve}`,
      );
    }
  });
});

describe("l'interrupteur de tarif mene au bon bon de commande", () => {
  // L'interrupteur mensuel / annuel n'a AUCUN JavaScript : un lien ne
  // peut donc pas changer d'adresse au clic. Les deux sont rendues, et
  // `:has()` montre la bonne. Sans ca, quelqu'un qui choisit l'annee
  // atterrit sur le bon de commande du MOIS, et ne le voit qu'en payant.

  test("chaque colonne payante porte SES deux destinations", () => {
    const c = colonnesDeTarif(LANDING.fr);
    assert.equal(c[0].lienAn, null, "le gratuit n'a pas de cadence");
    assert.equal(c[1].lien, "/commande/mensuel");
    assert.equal(c[1].lienAn, "/commande/annuel");
    assert.equal(c[2].lien, "/commande/mensuel-plus");
    assert.equal(c[2].lienAn, "/commande/annuel-plus");
  });

  test("le libelle du bouton n'est pas le meme sur les trois colonnes", () => {
    // "Creer mon compte gratuit" sur la colonne a 29 EUR etait faux.
    for (const langue of Object.keys(LANDING)) {
      const libelles = colonnesDeTarif(LANDING[langue]).map((c) => c.cta);
      assert.equal(new Set(libelles).size, 3, `${langue} : deux colonnes portent le meme bouton`);
    }
  });

  test("le prix annuel est un PRIX, jamais une phrase", () => {
    // Le premier jet affichait "ou 170,00 EUR par an" en 42 px.
    for (const langue of Object.keys(LANDING)) {
      for (const c of colonnesDeTarif(LANDING[langue])) {
        if (!c.prixAn) continue;
        assert.ok(
          c.prixAn.split(/\s+/).length <= 2,
          `${langue} : le gros chiffre porte une phrase -> ${c.prixAn}`,
        );
      }
    }
  });
});
