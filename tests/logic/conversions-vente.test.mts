// tests/logic/conversions-vente.test.mts
//
// LES CONVERSIONS DES PAGES DE VENTE : LE MONTANT, ET LA DÉDUPLICATION.
//
// Béné, 2 septembre 2026 : "dans mon admin : je peux tracker les visites
// sur nos deux pages de vente ? Mesurer les conversions etc ?"
//
// Mesuré ce jour là : les visites oui, les CONVERSIONS non. Il n'y avait
// dans tout le dépôt que le `gtag('config')` de la page vue, donc Google
// voyait le trafic sans pouvoir dire quelle source, quelle page ou
// quelle publicité avait produit une vente.
//
// -- CE QUE CE FILET TIENT, ET POURQUOI ------------------------------
//
// 1. LE MONTANT VIENT DU CATALOGUE. Un chiffre recopié devient faux au
//    premier changement de tarif, et elle prendrait des décisions de
//    publicité sur un chiffre d'affaires inventé. Un chiffre gonflé
//    dans un tableau de bord est pire qu'une absence de chiffre.
//
// 2. GA4 ATTEND DES UNITÉS, PAS DES CENTIMES. Envoyer 1700 au lieu de
//    17 multiplierait son chiffre d'affaires par cent, et rien ne le
//    signalerait : c'est le genre d'erreur qu'on ne voit qu'en
//    comparant deux rapports.
//
// 3. UN `purchase` SANS RÉFÉRENCE NE PART PAS. La page de retour est
//    une adresse comme une autre : elle se rafraîchit et se repartage.
//    `transaction_id` est ce qui permet à GA4 de dédupliquer.
//
// 4. LA MÊME PORTE QUE LA BALISE. Une conversion envoyée après un
//    "refuser" serait pire qu'une visite mesurée sans accord : elle
//    porte un montant et une référence de commande.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { sansCommentaires } from "./aide/sansCommentaires.mts";

import { evenementBeginCheckout, evenementPurchase } from "@/lib/analytics/conversions";
import { OWNER_CATALOG, OWNER_PRODUCT_ORDER } from "@/lib/checkout/catalog";

const lire = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

/**
 * Les sources du dépôt, pour les gardes qui BALAIENT au lieu de
 * surveiller une liste. Les dossiers de sortie et les dépendances sont
 * écartés : `.next` porte des copies compilées de ces mêmes fichiers,
 * et elles feraient compter deux fois le même appel.
 */
const HORS_BALAYAGE = new Set([
  "node_modules", ".next", ".git", "public", "coverage", "tests",
]);
function fichiersDuDepot(dossier = "."): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(path.join(process.cwd(), dossier), { withFileTypes: true })) {
    if (e.name.startsWith(".") && e.name !== ".") continue;
    const rel = dossier === "." ? e.name : `${dossier}/${e.name}`;
    if (e.isDirectory()) {
      if (HORS_BALAYAGE.has(e.name)) continue;
      out.push(...fichiersDuDepot(rel));
    } else if (/\.(ts|tsx|mts)$/.test(e.name)) {
      out.push(rel);
    }
  }
  return out;
}

describe("le montant vient du catalogue, jamais d'ailleurs", () => {
  test("chaque palier vendu porte SON prix, en unités", () => {
    for (const id of OWNER_PRODUCT_ORDER) {
      const produit = OWNER_CATALOG[id];
      const ev = evenementBeginCheckout(id);
      assert.ok(ev, `${id} : aucun événement`);
      assert.equal(ev.name, "begin_checkout");
      // Le catalogue est en CENTIMES (ce que Stripe encaisse), GA4 veut
      // des unités : 1700 centimes -> 17.
      assert.equal(ev.params.value, produit.amountCents / 100, `${id} : montant`);
      assert.equal(ev.params.currency, produit.currency.toUpperCase(), `${id} : devise`);
      const items = ev.params.items as Array<Record<string, unknown>>;
      assert.equal(items.length, 1);
      assert.equal(items[0].item_id, produit.id);
      assert.equal(items[0].item_name, produit.label);
      assert.equal(items[0].price, produit.amountCents / 100);
      assert.equal(items[0].quantity, 1);
    }
  });

  test("aucun PRIX n'est écrit en dur dans le module", () => {
    // C'est la faute qui coûte le plus cher ici : un prix recopié reste
    // vrai le jour où on l'écrit, et faux à chaque changement de tarif.
    //
    // Le test vise les PRIX, pas les nombres : mon premier jet refusait
    // tout littéral de trois chiffres et rougissait sur le `100` qui
    // convertit les centimes en unités, c'est à dire sur du code juste.
    // Un test qui crie pour rien finit désactivé.
    const src = sansCommentaires(lire("lib/analytics/conversions.ts"));
    for (const id of OWNER_PRODUCT_ORDER) {
      const centimes = OWNER_CATALOG[id].amountCents;
      assert.doesNotMatch(
        src,
        new RegExp(`\\b${centimes}\\b`),
        `le prix de ${id} (${centimes}) est recopié dans le module`,
      );
    }
    assert.doesNotMatch(src, /\b\d{4,}\b/, "un littéral à quatre chiffres ressemble à un prix");
    assert.match(src, /findOwnerProduct/);
  });

  test("le prix affiché sur le bon de commande et le montant envoyé sont le MÊME", () => {
    // Deux lectures du prix qui divergeraient donneraient un rapport
    // Google qui ne colle pas à ce qui a été encaissé.
    for (const id of OWNER_PRODUCT_ORDER) {
      const ev = evenementBeginCheckout(id)!;
      assert.equal((ev.params.value as number) * 100, OWNER_CATALOG[id].amountCents);
    }
  });

  test("un produit inconnu ne rend AUCUN événement", () => {
    // Mieux vaut un tunnel incomplet qu'une conversion sans montant :
    // elle polluerait le rapport sans qu'on sache d'où elle vient.
    for (const faux of ["", "  ", "mensuel-gratuit", "tiquiz", null, undefined]) {
      assert.equal(evenementBeginCheckout(faux as string), null, String(faux));
      assert.equal(
        evenementPurchase({ produitId: faux as string, reference: "cs_test_123" }),
        null,
        String(faux),
      );
    }
  });
});

describe("un purchase sans référence ne part pas", () => {
  test("la référence devient le transaction_id", () => {
    const ev = evenementPurchase({ produitId: "annuel", reference: "cs_live_abc123" });
    assert.ok(ev);
    assert.equal(ev.name, "purchase");
    assert.equal(ev.params.transaction_id, "cs_live_abc123");
    assert.equal(ev.params.value, OWNER_CATALOG.annuel.amountCents / 100);
  });

  test("aucune référence : AUCUN événement", () => {
    // Sans `transaction_id`, chaque rafraîchissement de la page de
    // retour compterait une vente de plus.
    for (const vide of ["", "   ", null, undefined]) {
      assert.equal(
        evenementPurchase({ produitId: "mensuel", reference: vide as string }),
        null,
        String(vide),
      );
    }
  });
});

describe("là où les deux événements sont posés", () => {
  test("begin_checkout part du bon de commande, avec le produit du serveur", () => {
    const src = sansCommentaires(lire("app/commande/[produit]/page.tsx"));
    assert.match(src, /evenementBeginCheckout\(product\.id\)/);
    // L'hôte est décidé côté SERVEUR : c'est la seule source qu'on ne
    // peut pas contourner depuis le navigateur.
    assert.match(src, /estHoteDeVente=\{isPublicSalesHost\(host\)\}/);
  });

  test("purchase part de la page de retour, et SEULEMENT sur un paiement confirmé", () => {
    const src = sansCommentaires(lire("app/commande/[produit]/retour/page.tsx"));
    assert.match(
      src,
      /etat === "paye"\s*\?\s*evenementPurchase\(/,
      "une conversion partirait sur une simple ouverture de l'URL",
    );
    // La référence vient du fournisseur relu, jamais de l'URL prise
    // telle quelle : sinon n'importe qui fabrique une conversion.
    assert.match(src, /aboPaypal \? abonnementPaypal : session \? sessionId : null/);
  });

  test("aucun montant n'est réécrit dans les deux pages", () => {
    for (const page of [
      "app/commande/[produit]/page.tsx",
      "app/commande/[produit]/retour/page.tsx",
    ]) {
      const src = sansCommentaires(lire(page));
      assert.doesNotMatch(src, /value:\s*\d/, `${page} : un montant écrit à la main`);
    }
  });
});

describe("la même porte que la balise, consentement compris", () => {
  // ── CE GARDE-FOU A ROUGI SUR UNE CORRECTION JUSTE (9 septembre) ────
  //
  // Il lisait la source de `ConversionGa4.tsx` et y exigeait
  // `chargerAnalytics({`. Le jour où la décision d'envoi a déménagé
  // dans `lib/analytics/envoi.ts` (pour que les cinq événements du
  // parcours passent par la MÊME porte, au lieu d'en recopier une
  // deuxième), quatre de ses cas sont sortis rouges sur un dépôt plus
  // sain qu'avant.
  //
  // **Un garde-fou qui fige un EMPLACEMENT empêche de déplacer le
  // code.** Il vise maintenant le FAIT : il n'existe qu'UNE porte dans
  // tout le dépôt, elle relit l'accord, et le composant DÉLÈGUE.

  const PORTE = "lib/analytics/envoi.ts";
  const porte = sansCommentaires(lire(PORTE));
  const conversion = sansCommentaires(lire("components/analytics/ConversionGa4.tsx"));

  test("il n'y a qu'UNE porte de plus que la balise, où qu'on l'écrive", () => {
    // ON BALAIE, on ne surveille pas une liste : une liste oublie le
    // prochain fichier écrit, et c'est exactement comme ça qu'une
    // deuxième porte s'installerait (leçon des 47 `.ilike`).
    //
    // Deux appelants légitimes, et deux seulement : la BALISE (elle
    // décide de se charger) et la PORTE des événements. Un troisième
    // déciderait de son côté, et les trois finiraient par ne plus dire
    // la même chose.
    const attendus = new Set([
      "components/analytics/GoogleAnalytics.tsx",
      PORTE,
    ]);
    const trouves = new Set<string>();
    for (const fichier of fichiersDuDepot()) {
      const src = sansCommentaires(lire(fichier));
      // La DÉFINITION n'est pas un appel.
      if (/export function chargerAnalytics/.test(src)) continue;
      if (/chargerAnalytics\(\s*\{/.test(src)) trouves.add(fichier);
    }
    assert.deepEqual(
      [...trouves].sort(),
      [...attendus].sort(),
      "une deuxième porte décide de son côté, ou la porte a disparu",
    );
  });

  test("la porte relit SA règle de consentement, pas une condition à elle", () => {
    // Le bandeau de Béné oublie le choix au bout de `MEMOIRE_CONSENTEMENT_JOURS`
    // jours : relire la clé sans passer par `consentementMesure`
    // mesurerait encore quelqu'un dont l'accord a expiré de son côté.
    assert.match(porte, /consentementMesure\(/);
    assert.match(porte, /CLE_CONSENTEMENT/);
  });

  test("un refus ne laisse partir AUCUNE conversion", () => {
    // Le doute ne profite jamais à la mesure : stockage bloqué, JSON
    // illisible, navigation privée -> non.
    assert.match(porte, /catch \{[\s\S]{0,200}return false;/);
  });

  test("le composant DÉLÈGUE : il ne pousse rien lui même", () => {
    assert.match(conversion, /envoyerEvenement\(/);
    assert.doesNotMatch(
      conversion,
      /dataLayer/,
      "le composant repousse dans dataLayer : c'est la deuxième porte",
    );
  });

  test("et l'événement ne part qu'une fois par montage", () => {
    // React remonte un composant à la moindre raison. `begin_checkout`
    // n'a aucun identifiant pour se dédupliquer côté GA4.
    //
    // Le NOM du drapeau n'est pas figé (il a déjà changé une fois) :
    // ce qui compte est qu'un `useRef` garde la remise et qu'on sorte
    // avant d'envoyer une deuxième fois.
    assert.match(conversion, /useRef\(false\)/);
    assert.match(conversion, /\.current\)\s*return/);
  });

  test("le composant ne DÉCIDE rien : l'événement arrive construit", () => {
    // Le montant vient du serveur, donc du catalogue. Le calculer ici
    // le rendrait forgeable depuis le navigateur.
    assert.doesNotMatch(conversion, /findOwnerProduct|amountCents|OWNER_CATALOG/);
  });

  test("on pousse un objet `arguments`, jamais un tableau qui y ressemble", () => {
    // C'est LE shim de Google (`function gtag(){dataLayer.push(arguments);}`,
    // cf. `google.ts`). Un tableau ordinaire n'est documenté nulle
    // part : rien ne dit que gtag.js le traiterait, et une conversion
    // ignorée en silence ne se découvre qu'en regardant un rapport
    // vide des semaines plus tard.
    assert.match(porte, /push\(arguments\)/);
    assert.doesNotMatch(porte, /push\(\[\s*"event"/);
    assert.match(porte, /gtag\("event", evenement\.name, evenement\.params\)/);
  });
});
