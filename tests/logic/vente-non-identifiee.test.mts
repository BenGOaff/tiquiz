// tests/logic/vente-non-identifiee.test.mts
//
// « J'AI FAIT UNE VENTE SUR NOTRE NOUVEAU SYSTÈME, MAIS RIEN N'EST
//   IDENTIFIÉ CORRECTEMENT. NI DANS PILOTAGE NI DANS L'ADMIN DE TIQUIZ »
//   (Béné, 17 septembre 2026)
//
// Ce qu'elle avait sous les yeux, mot pour mot :
//
//   - sur l'accueil : « null a payé 17 € le 17 septembre 2026 et
//     n'apparaît dans aucun compte » ;
//   - dans les ventes : une ligne PayPal à 17,00 € sans nom, « Produit
//     non identifié » ;
//   - et cinq échéances carte à 9,00 €, toutes « Produit non
//     identifié », alors que ce sont ses abonnements Tiquiz vendus par
//     Systeme.io, à l'ancien prix.
//
// -- LA CAUSE, ET ELLE N'EST PAS DANS L'ÉCRAN --------------------------
//
// Le webhook PayPal SAIT qui a payé : il relit l'abonnement chez PayPal
// et en tire l'adresse saisie, le produit du catalogue et le code de
// l'affiliée. Il écrit ensuite tout ça dans un `console.log`. Le
// tableau de bord, lui, relit le payload BRUT de l'événement, et
// `PAYMENT.SALE.COMPLETED` est le PRÉLÈVEMENT, pas l'abonnement : PayPal
// n'y recopie pas toujours le `custom_id`.
//
// C'est le piège numéro 1 de ce dépôt, par une porte de plus : une
// décision prise à un endroit, re-déduite à un autre, et les deux
// finissent par ne plus dire la même chose.
//
// Et la conséquence dépassait l'affichage : `buildPeople` range une
// vente sans adresse dans les ORPHELINES, donc l'accueil ANNONÇAIT une
// vente sans compte sur une cliente qui a son compte.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildSales, marqueurBonDeCommande, type EventRow } from "../../lib/checkout/sales.ts";
import { buildPeople } from "../../lib/admin/people.ts";
import { planTiquizParMontant } from "../../lib/sio/webhookInference.ts";
import {
  cleIdentite,
  commissionAVerifier,
  completerVentes,
  etatCommission,
  nomProduitComplete,
  produitParMontantCents,
  resumeCommissions,
  statutDepuisTipote,
  type IdentiteVente,
} from "../../lib/ventes/identite.ts";

function lire(rel: string): string {
  return readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

/** L'échéance PayPal telle qu'elle est arrivée le 17 septembre. */
function echeancePaypal(over: Record<string, unknown> = {}): EventRow {
  return {
    source: "paypal",
    event_type: "PAYMENT.SALE.COMPLETED",
    event_id: "WH-17SEPT",
    created_at: "2026-09-17T09:12:00.000Z",
    payload: {
      resource: {
        id: "3TR55555AB1234567",
        // PayPal N'A PAS recopié le custom_id de l'abonnement.
        billing_agreement_id: "I-BW452GLLEP1G",
        amount: { total: "17.00", currency: "EUR" },
        ...over,
      },
    },
  };
}

/** Une échéance Stripe d'un abonnement que NOUS n'avons pas ouvert. */
function echeanceStripeSansNous(montantCents: number): EventRow {
  return {
    source: "stripe",
    event_type: "invoice.paid",
    event_id: "evt_sio_1",
    created_at: "2026-09-17T06:00:00.000Z",
    payload: {
      data: {
        object: {
          id: "in_sio_1",
          payment_intent: "pi_sio_1",
          customer_email: "jocelynebacquet.auteur@gmail.com",
          customer_name: "Jocelyne Bacquet",
          billing_reason: "subscription_cycle",
          amount_paid: montantCents,
          currency: "eur",
          // AUCUNE de nos clés : ni sur la facture, ni sur l'abonnement.
          metadata: {},
          subscription: "sub_systemeio_1",
          lines: { data: [{ metadata: {}, price: { metadata: {} } }] },
        },
      },
    },
  };
}

describe("La vente PayPal du 17 septembre", () => {
  test("LE FIL VERS L'ABONNEMENT N'EST PLUS JETÉ", () => {
    // `billing_agreement_id` est le SEUL champ qui relie le prélèvement
    // à l'abonnement, donc à la personne. Le lecteur le laissait tomber.
    const [vente] = buildSales([echeancePaypal()]);
    assert.equal(vente!.subscriptionId, "I-BW452GLLEP1G");
    // Et sans `custom_id`, il n'a toujours ni adresse ni produit : ce
    // n'est pas une régression, c'est la vérité du payload reçu.
    assert.equal(vente!.email, null);
    assert.equal(vente!.productId, null);
  });

  test("L'ADRESSE SE RETROUVE PAR L'ABONNEMENT, un fait qu'on a écrit nous mêmes", () => {
    // `profiles.paypal_subscription_id` est posé par NOTRE webhook à
    // l'activation (`rememberPaypalSubscription`). Ce n'est pas un
    // rapprochement au flair : c'est le fil qu'on a posé exprès.
    const [vente] = completerVentes(buildSales([echeancePaypal()]), {
      fiches: {},
      emailParAbonnement: { "I-BW452GLLEP1G": "cliente@exemple.fr" },
    });
    assert.equal(vente!.email, "cliente@exemple.fr");
  });

  test("LE PRODUIT SE NOMME PAR SON MONTANT, sans inventer d'adresse", () => {
    const [vente] = completerVentes(buildSales([echeancePaypal()]), {
      fiches: {},
      emailParAbonnement: {},
    });
    // 17,00 EUR est le mensuel du catalogue : c'est une LECTURE, pas une
    // devinette. Une somme remisee ne correspondrait a rien.
    assert.equal(vente!.productId, "mensuel");
    assert.equal(nomProduitComplete(vente!), "Tiquiz mensuel");
    // Le montant nomme le produit, il ne fabrique JAMAIS une adresse.
    assert.equal(vente!.email, null);
  });

  test("LA FICHE DU WEBHOOK GAGNE SUR TOUT LE RESTE", () => {
    const fiche: IdentiteVente = {
      provider: "paypal",
      reference: "3TR55555AB1234567",
      email: "saisie-sur-le-bon-de-commande@exemple.fr",
      nom: "Une cliente",
      productId: "mensuel-plus",
      productLabel: "Tiquiz mensuel Plus",
      subscriptionId: "I-BW452GLLEP1G",
      origine: "bon_de_commande",
      affiliateRef: null,
      affiliateCode: "jocelyne",
      commission: { statut: "attribuee", cents: 567, affilie: "sa123", detail: null },
    };
    const [vente] = completerVentes(buildSales([echeancePaypal()]), {
      fiches: { [cleIdentite("paypal", "3TR55555AB1234567")]: fiche },
      // L'adresse du compte PayPal n'est pas toujours celle saisie : la
      // fiche porte celle SAISIE, et c'est elle qui doit gagner.
      emailParAbonnement: { "I-BW452GLLEP1G": "compte-paypal-du-conjoint@exemple.fr" },
    });
    assert.equal(vente!.email, "saisie-sur-le-bon-de-commande@exemple.fr");
    assert.equal(vente!.productId, "mensuel-plus");
    assert.equal(vente!.commission?.statut, "attribuee");
  });

  test("UNE VALEUR PRÉSENTE N'EST JAMAIS ÉCRASÉE par une fiche", () => {
    // Le payload du fournisseur reste la vérité de ce qu'il a envoyé.
    // Une fiche COMBLE un trou, elle ne réécrit pas l'original.
    const avecCustomId = echeancePaypal({
      custom_id: "annuel|vraie-adresse@exemple.fr||",
    });
    const [vente] = completerVentes(buildSales([avecCustomId]), {
      fiches: {
        [cleIdentite("paypal", "3TR55555AB1234567")]: {
          provider: "paypal",
          reference: "3TR55555AB1234567",
          email: "autre@exemple.fr",
          nom: null,
          productId: "mensuel",
          productLabel: null,
          subscriptionId: null,
          origine: "bon_de_commande",
          affiliateRef: null,
          affiliateCode: null,
          commission: null,
        },
      },
      emailParAbonnement: {},
    });
    assert.equal(vente!.email, "vraie-adresse@exemple.fr");
    assert.equal(vente!.productId, "annuel");
  });

  test("ELLE N'EST PLUS ANNONCÉE COMME N'APPARTENANT À AUCUN COMPTE", () => {
    // LE POINT LE PLUS CHER DE CE FICHIER. Une alerte d'argent fausse
    // sur l'accueil, c'est une alerte qu'on arrête de lire, et le jour
    // où une vraie apparaît à côté, personne ne la voit.
    const brutes = buildSales([echeancePaypal()]);
    const profils = [{ user_id: "u1", email: "cliente@exemple.fr", plan: "monthly" }];

    const avant = buildPeople({ profiles: profils, sales: brutes, churn: [], atelier: [] });
    assert.equal(avant.ventesOrphelines.length, 1, "le cas d'origine n'est plus reproduit");

    const apres = buildPeople({
      profiles: profils,
      sales: completerVentes(brutes, {
        fiches: {},
        emailParAbonnement: { "I-BW452GLLEP1G": "cliente@exemple.fr" },
      }),
      churn: [],
      atelier: [],
    });
    assert.equal(apres.ventesOrphelines.length, 0, "la vente reste orpheline");
    // Et elle est bien comptée sur SA fiche, avec son montant.
    const elle = apres.people.find((p) => p.email === "cliente@exemple.fr");
    assert.equal(elle?.sales.length, 1);
    assert.equal(elle?.paidCents, 1700);
  });

  test("L'ACCUEIL N'ÉCRIT JAMAIS LE MOT « null »", () => {
    // La phrase exacte qu'elle a lue. Le garde-fou reste même après la
    // correction de la cause : une vente vraiment sans adresse est un
    // cas légitime, et il doit se lire comme une phrase.
    const src = lire("components/pilotage/AccueilPilotage.tsx");
    assert.ok(
      !/\$\{v\.email\} a payé/.test(src),
      "l'accueil interpole encore l'adresse sans garde-fou : un null redevient le mot 'null'",
    );
    assert.match(src, /sans adresse/, "l'accueil ne dit plus quoi faire d'une vente sans adresse");
  });
});

describe("Les abonnements Tiquiz vendus par Systeme.io", () => {
  test("900 CENTIMES EST UN MENSUEL TIQUIZ, et la table le savait déjà", () => {
    // `AMOUNT_TO_PLAN` porte 900 depuis toujours (l'ancien prix, avant le
    // 6 août 2026). Seul le webhook Systeme.io la lisait : le tableau de
    // bord ne comparait qu'au catalogue de notre bon de commande, donc
    // les cinq échéances de 9,00 EUR sortaient en "non identifié".
    assert.equal(planTiquizParMontant(900), "monthly");
    assert.equal(produitParMontantCents(900)?.label, "Tiquiz mensuel");
    assert.equal(produitParMontantCents(9000)?.label, "Tiquiz annuel");
    // Le catalogue actuel passe DEVANT, avec son libellé à lui.
    assert.equal(produitParMontantCents(1700)?.id, "mensuel");
    assert.equal(produitParMontantCents(29000)?.id, "annuel-plus");
  });

  test("UN MONTANT REMISÉ NE NOMME RIEN, et c'est voulu", () => {
    // On préfère "non identifié" à un faux nom : son compte porte
    // 54 codes de réduction actifs, dont certains à 100 %.
    assert.equal(produitParMontantCents(1234), null);
    assert.equal(produitParMontantCents(0), null);
    assert.equal(produitParMontantCents(-1700), null);
    // Et l'unité est CERTAINE ici : 9 centimes n'est pas 9 euros.
    assert.equal(planTiquizParMontant(9), null);
  });

  test("UNE ÉCHÉANCE SANS NOTRE MARQUEUR N'EST PAS NOTRE BON DE COMMANDE", () => {
    const [vente] = buildSales([echeanceStripeSansNous(900)]);
    assert.equal(vente!.origine, "hors_bon_de_commande");
    assert.equal(vente!.subscriptionId, "sub_systemeio_1");
    // Elle porte maintenant un nom, au lieu de "Produit non identifié".
    assert.equal(nomProduitComplete(vente!), "Tiquiz mensuel");
  });

  test("ET AVEC NOTRE MARQUEUR, C'EST NOTRE VENTE", () => {
    const facture = {
      metadata: {},
      parent: { subscription_details: { metadata: { product: "mensuel" } } },
    };
    assert.equal(marqueurBonDeCommande(facture), "mensuel");
    assert.equal(marqueurBonDeCommande({ metadata: {}, lines: { data: [] } }), null);
  });

  test("ELLE N'ATTEND AUCUNE COMMISSION DE NOTRE CÔTÉ, et l'écran le DIT", () => {
    // C'est EUX qui paient l'affilié sur ces ventes. Ne rien créer est
    // le comportement juste ; laisser la colonne vide ferait chercher
    // une commission oubliée chaque mois, sur cinq lignes.
    const [vente] = buildSales([echeanceStripeSansNous(900)]);
    assert.equal(etatCommission(vente!), "reglee_ailleurs");
    const complete = completerVentes([vente!], { fiches: {}, emailParAbonnement: {} })[0]!;
    assert.equal(complete.commission?.statut, "reglee_ailleurs");
  });
});

describe("La garantie qu'aucun affilié n'est lésé", () => {
  test("DIX ÉTATS, PARCE QUE DEUX NE SUFFISENT PAS", () => {
    // "aucun affilié" et "on n'a pas regardé" se lisaient pareil, et
    // c'est la deuxième qui coûte de l'argent à quelqu'un.
    const base = { provider: "stripe" as const, amountCents: 1700, origine: "bon_de_commande" as const };
    assert.equal(etatCommission({ ...base, commission: null }), "sans_trace");
    assert.equal(
      etatCommission({ ...base, commission: { statut: "aucun_affilie", cents: null, affilie: null, detail: null } }),
      "aucun_affilie",
    );
    // Un encaissement a zero (le mois offert) ne commissionne personne,
    // et ce n'est pas une anomalie.
    assert.equal(etatCommission({ ...base, amountCents: 0, commission: null }), "rien_a_devoir");
    // Une vente Systeme.io est commissionnee par Systeme.io.
    assert.equal(
      etatCommission({ ...base, provider: "systeme_io", commission: null }),
      "reglee_ailleurs",
    );
  });

  test("SEULS QUATRE ÉTATS APPELLENT UN HUMAIN", () => {
    for (const bon of ["attribuee", "aucun_affilie", "doublon", "reglee_ailleurs", "en_attente"] as const) {
      assert.equal(commissionAVerifier(bon), false, `${bon} ne devrait pas alerter`);
    }
    for (const mauvais of ["affilie_inconnu", "non_tentee", "reponse_inconnue"] as const) {
      assert.equal(commissionAVerifier(mauvais), true, `${mauvais} devrait alerter`);
    }
    // Et l'ABSENCE de verdict alerte : c'est le cas "je n'ai pas
    // regardé", qui ne doit jamais se lire comme "tout va bien".
    assert.equal(commissionAVerifier(null), true);
  });

  test("LES RÉPONSES DU REGISTRE SE TRADUISENT UNE SEULE FOIS", () => {
    assert.equal(statutDepuisTipote("attributed"), "attribuee");
    assert.equal(statutDepuisTipote("no_affiliate_match"), "aucun_affilie");
    assert.equal(statutDepuisTipote("affiliate_not_registered"), "affilie_inconnu");
    assert.equal(statutDepuisTipote("duplicate"), "doublon");
    // Une réponse qu'on ne connaît pas n'est PAS rangée dans la plus
    // probable : elle demande un humain.
    assert.equal(statutDepuisTipote("quelque_chose_de_neuf"), "reponse_inconnue");
    assert.equal(statutDepuisTipote(null), "reponse_inconnue");
  });

  test("UNE VENTE REMBOURSÉE N'APPELLE PLUS PERSONNE", () => {
    // Sa commission est annulée par construction : la compter comme
    // manquante ferait crier sur du travail juste.
    const bilan = resumeCommissions([
      {
        ref: "a", provider: "stripe", email: "x@y.fr", name: null, productId: "mensuel",
        amountCents: 1700, amountSource: "payload", currency: "eur",
        paidAt: "2026-09-01T00:00:00Z", refundedAt: "2026-09-05T00:00:00Z",
        origine: "bon_de_commande", commission: null,
      },
      {
        ref: "b", provider: "stripe", email: "z@y.fr", name: null, productId: "mensuel",
        amountCents: 1700, amountSource: "payload", currency: "eur",
        paidAt: "2026-09-02T00:00:00Z", refundedAt: null,
        origine: "bon_de_commande", commission: null,
      },
      {
        ref: "c", provider: "paypal", email: "w@y.fr", name: null, productId: "mensuel",
        amountCents: 1700, amountSource: "payload", currency: "eur",
        paidAt: "2026-09-03T00:00:00Z", refundedAt: null, origine: "bon_de_commande",
        commission: { statut: "attribuee", cents: 567, affilie: "sa1", detail: null },
      },
    ]);
    assert.equal(bilan.aVerifier, 1, "seule la vente non remboursee sans trace doit alerter");
    assert.equal(bilan.attribuees, 1);
    assert.equal(bilan.centsAttribues, 567);
  });

  test("LE VERDICT REMONTE DU REGISTRE JUSQU'À LA FICHE", () => {
    // `commissionnerVente` connaissait la réponse de Tipote et
    // l'écrivait dans la sortie standard du serveur, c'est à dire nulle
    // part de consultable.
    const src = lire("lib/affiliate/ownerSale.ts");
    assert.match(src, /Promise<VerdictCommission>/, "commissionnerVente ne rend plus son verdict");
    // Chacune de ses sorties rend un statut : une sortie muette est une
    // commission perdue sans trace (audit du 11 septembre).
    assert.ok(!/\n {6}return;\n/.test(src), "une sortie de commissionnerVente est redevenue muette");

    for (const webhook of [
      "app/api/commande/webhook/route.ts",
      "app/api/commande/paypal/webhook/route.ts",
    ]) {
      const w = lire(webhook);
      assert.match(w, /ecrireFiche\(/, `${webhook} n'ecrit plus l'identite de l'encaissement`);
      assert.match(w, /ecrireVerdictCommission\(/, `${webhook} ne range plus le verdict`);
    }
  });

  test("LA FICHE S'ÉCRIT AVANT L'APPEL À TIPOTE", () => {
    // Si le registre ne répond pas, l'identité de l'acheteur doit être
    // sauvée quand même : c'est la moitié la plus utile, et c'est celle
    // que Béné avait perdue.
    const w = lire("app/api/commande/paypal/webhook/route.ts");
    const iFiche = w.indexOf("await ecrireFiche({");
    const iCommission = w.indexOf("await commissionnerVente({");
    assert.ok(iFiche > 0 && iCommission > 0);
    assert.ok(iFiche < iCommission, "la fiche s'ecrit apres l'appel a Tipote");
  });

  test("LA CLÉ DE LA COMMISSION EST LISIBLE DEPUIS TIQUIZ", () => {
    // Sans elle, l'audit ne peut que comparer des TOTAUX, c'est à dire
    // deviner. Elle vit dans le dépôt de Tipote : ce test dit lequel,
    // pour que le jour où elle disparaît, on sache où regarder.
    const script = lire("scripts/audit-affiliation.mts");
    assert.match(script, /orderId/, "l'audit ne rapproche plus par la cle de l'encaissement");
    assert.match(script, /affiliate-payouts/);
    assert.match(script, /partner\/affilies/, "l'audit ne lit plus les rattachements");
    // LECTURE SEULE, sans option pour en sortir : un versement ne se
    // reprend pas, donc un audit ne le déclenche pas.
    assert.ok(
      !/attribute-sale["`']/.test(script),
      "l'audit poste vers Tipote : il ferait partir de l'argent",
    );
  });

  test("L'AUDIT NE CONCLUT JAMAIS « TOUT VA BIEN » SANS AVOIR PU REGARDER", () => {
    // Le vert trompeur est la panne la plus chère de ces dépôts : un
    // écran vert est exactement ce qu'on aurait vu pendant les quinze
    // jours de statistiques perdues.
    const script = lire("scripts/audit-affiliation.mts");
    assert.match(script, /CE QUE JE N'AI PAS PU REGARDER/);
    assert.match(script, /on ne peut PAS conclure/);
  });
});

describe("La migration qui porte tout ça", () => {
  test("ELLE EST IDEMPOTENTE, FERMÉE, ET ELLE RECHARGE LE SCHÉMA", () => {
    const sql = lire("supabase/migrations/20260918_ventes_identite.sql");
    assert.match(sql, /create table if not exists public\.ventes_identite/);
    // La cle d'unicite EST celle de la commission : deux fiches pour un
    // encaissement donneraient deux reponses a la meme question.
    assert.match(sql, /create unique index if not exists[\s\S]{0,120}\(provider, reference\)/);
    // Des adresses de clients et des montants de commission : RLS
    // active, aucune policy, donc personne sauf la cle de service.
    assert.match(sql, /enable row level security/);
    assert.ok(!/create policy/i.test(sql), "une policy ouvre la table a autre chose que l'admin");
    assert.match(sql, /notify pgrst, 'reload schema'/);
  });

  test("UNE TABLE ABSENTE NE PRIVE DE RIEN, et le dit", () => {
    const store = lire("lib/ventes/identiteStore.ts");
    // Le message nomme la migration a appliquer : sans ca, un
    // deploiement en avance sur sa migration est un mystere.
    assert.match(store, /20260918_ventes_identite\.sql/);
    // Et la lecture distingue "je n'ai pas pu regarder" de "il n'y a
    // rien" : c'est la regle du 11 septembre, sur de l'argent du.
    assert.match(store, /lisible: false/);
    const ecran = lire("components/pilotage/VentesPilotage.tsx");
    assert.match(ecran, /identitesLisibles === false/);
    // `&apos;` et pas une apostrophe : c'est du JSX, et l'entite est la
    // forme que le linter impose. Viser l'apostrophe nue ferait rougir
    // ce test sur un texte parfaitement correct.
    assert.match(ecran, /n&apos;est pas la preuve/);
  });
});
